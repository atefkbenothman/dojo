import { convex } from "../../lib/convex-client"
import { getModelInstance } from "../ai/models"
import { streamObjectResponse } from "../ai/stream-object"
import { streamTextResponse } from "../ai/stream-text"
import { aggregateMcpTools } from "../mcp/connection"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { env } from "@dojo/env/backend"
import { tryCatch, decryptApiKey } from "@dojo/utils"
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
      const combinedTools = session ? aggregateMcpTools(session._id) : {}

      console.log(`${AgentService.LOG_PREFIX} Running agent ${agent._id} for userId: ${userIdForLogging}`)

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

      console.log(`${AgentService.LOG_PREFIX} Agent ${agent._id} execution completed successfully`)

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

      console.error(`${AgentService.LOG_PREFIX} Unhandled error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }
    }
  }

  private async getAgentModel(agent: Doc<"agents">, session: Doc<"sessions"> | undefined): Promise<LanguageModel> {
    let apiKey: string | undefined

    // For authenticated users, fetch from database
    if (session?.userId) {
      const apiKeyObject = await convex.query(api.apiKeys.getApiKeyForUserAndModel, {
        userId: session.userId,
        modelId: agent.aiModelId,
      })

      if (apiKeyObject) {
        const encryptionSecret = env.ENCRYPTION_SECRET
        if (!encryptionSecret) {
          throw new Error("Server configuration error: missing encryption secret.")
        }

        const decryptedApiKey = await decryptApiKey(apiKeyObject.apiKey, encryptionSecret)
        if (!decryptedApiKey) {
          throw new Error("Failed to decrypt API key.")
        }

        apiKey = decryptedApiKey
      }
    }

    // If still no API key, check if the model requires one
    if (!apiKey) {
      const model = await convex.query(api.models.get, { id: agent.aiModelId })
      if (!model) {
        throw new Error(`Model ${agent.aiModelId} not found`)
      }

      if (model.requiresApiKey) {
        throw new Error(`API key required for model ${model.name} used by agent ${agent.name}`)
      }

      // Use fallback API key for free models
      apiKey = env.GROQ_API_KEY_FALLBACK || ""
    }

    if (!apiKey) {
      throw new Error(`No API key available for model used by agent ${agent.name}`)
    }

    const { data: modelInstance, error: modelError } = tryCatch(getModelInstance(agent.aiModelId, apiKey))

    if (modelError || !modelInstance) {
      throw new Error(
        `Failed to initialize AI model for agent ${agent.name}: ${modelError?.message || "Unknown error"}`,
      )
    }

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
        console.log(
          `${AgentService.LOG_PREFIX} Using ${Object.keys(combinedTools).length} total tools for userId: ${userIdForLogging}`,
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
