import { convex } from "../../lib/convex-client"
import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { streamObjectResponse } from "../ai/stream-object"
import { streamTextResponse } from "../ai/stream-text"
import { mcpConnectionManager } from "../mcp/connection-manager"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { CoreMessage, LanguageModel, ToolSet } from "ai"
import type { Response } from "express"

interface RunAgentParams {
  agentId: string
  messages: CoreMessage[]
  session: Doc<"sessions"> | undefined
  res: Response
}

interface RunAgentResult {
  success: boolean
  error?: string
}

export class AgentService {
  private static readonly LOG_PREFIX = "[AgentService]"

  async runAgent(params: RunAgentParams): Promise<RunAgentResult> {
    const { agentId, messages, session, res } = params
    let executionId: Id<"agentExecutions"> | null = null

    try {
      // Fetch agent
      const agent = await convex.query(api.agents.get, { id: agentId as Id<"agents"> })

      if (!agent) {
        return {
          success: false,
          error: `Agent with id ${agentId} not found.`,
        }
      }

      // Validate agent has a model
      if (!agent.aiModelId) {
        return {
          success: false,
          error: `Agent "${agent.name}" does not have an AI model configured.`,
        }
      }

      // Get the AI model for this agent
      const aiModel = await this.getAgentModel(agent, session)

      const userIdForLogging = session?.userId || "anonymous"
      const combinedTools = session ? mcpConnectionManager.aggregateTools(session._id) : {}

      logger.info("Agent", `Running agent ${agent._id} for userId: ${userIdForLogging}`)

      // Create execution record if we have a session
      if (session) {
        // Get MCP servers that are currently connected
        const mcpServerIds = agent.mcpServers || []

        executionId = await convex.mutation(api.agentExecutions.create, {
          agentId: agent._id,
          sessionId: session._id,
          userId: session.userId || undefined,
          aiModelId: agent.aiModelId, // Use agent's model
          mcpServerIds,
        })

        // Update status to running
        await convex.mutation(api.agentExecutions.updateStatus, {
          executionId,
          status: "running",
        })
      }

      // Execute agent based on output type
      await this.executeAgent({
        agent,
        aiModel,
        messages,
        res,
        combinedTools,
        userIdForLogging,
      })

      // Update execution status to completed
      if (executionId) {
        await convex.mutation(api.agentExecutions.updateStatus, {
          executionId,
          status: "completed",
        })
      }

      logger.info("Agent", `Agent ${agent._id} execution completed successfully`)

      return { success: true }
    } catch (error) {
      // Update execution status to failed
      if (executionId) {
        await convex.mutation(api.agentExecutions.updateStatus, {
          executionId,
          status: "failed",
          error: error instanceof Error ? error.message : "Internal server error",
        })
      }

      logger.error("Agent", "Unhandled error", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }
    }
  }

  private async getAgentModel(agent: Doc<"agents">, session: Doc<"sessions"> | undefined): Promise<LanguageModel> {
    if (!session) {
      throw new Error("Session is required for agent execution")
    }

    // Use ModelManager to get the model instance (handles API keys, caching, etc.)
    const modelInstance = await modelManager.getModel(agent.aiModelId, session)

    return modelInstance as LanguageModel
  }

  private async executeAgent(params: {
    agent: Doc<"agents">
    aiModel: LanguageModel
    messages: CoreMessage[]
    res: Response
    combinedTools: ToolSet
    userIdForLogging: string
  }): Promise<void> {
    const { agent, aiModel, messages, res, combinedTools, userIdForLogging } = params

    switch (agent.outputType) {
      case "text":
        logger.info(
          "Agent",
          `Using ${Object.keys(combinedTools).length} total tools for userId: ${userIdForLogging}`,
        )
        await streamTextResponse({
          res,
          languageModel: aiModel,
          messages,
          tools: combinedTools,
        })
        break

      case "object":
        await streamObjectResponse({
          res,
          languageModel: aiModel,
          messages,
        })
        break

      default:
        throw new Error("Unknown or unhandled output type")
    }
  }
}

// Export singleton instance
export const agentService = new AgentService()
