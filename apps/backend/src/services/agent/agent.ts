import { convex } from "../../lib/convex-client"
import { streamObjectResponse } from "../ai/stream-object"
import { streamTextResponse } from "../ai/stream-text"
import { aggregateMcpTools } from "../mcp/connection"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { CoreMessage, LanguageModel } from "ai"
import type { Response } from "express"

interface RunAgentParams {
  agentId: string
  messages: CoreMessage[]
  session: Doc<"sessions"> | undefined
  aiModel: LanguageModel
  res: Response
}

interface RunAgentResult {
  success: boolean
  error?: string
}

export class AgentService {
  private static readonly LOG_PREFIX = "[AgentService]"

  async runAgent(params: RunAgentParams): Promise<RunAgentResult> {
    const { agentId, messages, session, aiModel, res } = params
    let agentAddedToSession = false

    try {
      // Fetch agent
      const agent = await convex.query(api.agents.get, { id: agentId as Id<"agents"> })

      if (!agent) {
        return {
          success: false,
          error: `Agent with id ${agentId} not found.`,
        }
      }

      const userIdForLogging = session?.userId || "anonymous"
      const combinedTools = session ? aggregateMcpTools(session._id) : {}

      console.log(`${AgentService.LOG_PREFIX} Running agent ${agent._id} for userId: ${userIdForLogging}`)

      // Add agent to running agents in session
      if (session) {
        agentAddedToSession = await this.addAgentToSession(session._id, agent._id)
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

      console.log(`${AgentService.LOG_PREFIX} Agent ${agent._id} execution completed successfully`)

      return { success: true }
    } catch (error) {
      console.error(`${AgentService.LOG_PREFIX} Unhandled error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }
    } finally {
      // Always remove agent from running agents when done
      if (session && agentAddedToSession) {
        await this.removeAgentFromSession(session._id, agentId as Id<"agents">)
      }
    }
  }

  private async addAgentToSession(sessionId: Id<"sessions">, agentId: Id<"agents">): Promise<boolean> {
    try {
      await convex.mutation(api.sessions.addRunningAgent, {
        sessionId,
        agentId,
      })
      console.log(`${AgentService.LOG_PREFIX} Added agent ${agentId} to running agents for session ${sessionId}`)
      return true
    } catch (error) {
      console.error(`${AgentService.LOG_PREFIX} Failed to add agent to session:`, error)
      // Continue anyway - this is not critical for agent execution
      return false
    }
  }

  private async removeAgentFromSession(sessionId: Id<"sessions">, agentId: Id<"agents">): Promise<void> {
    try {
      await convex.mutation(api.sessions.removeRunningAgent, {
        sessionId,
        agentId,
      })
      console.log(`${AgentService.LOG_PREFIX} Removed agent ${agentId} from running agents for session ${sessionId}`)
    } catch (error) {
      console.error(`${AgentService.LOG_PREFIX} Failed to remove agent from session:`, error)
    }
  }

  private async executeAgent(params: {
    agent: Doc<"agents">
    aiModel: LanguageModel
    messages: CoreMessage[]
    res: Response
    combinedTools: any
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
        console.error(`${AgentService.LOG_PREFIX} Unknown or unhandled output type: ${agent.outputType}`)
        throw new Error(`Unknown or unhandled output type: ${agent.outputType}`)
    }
  }
}

// Export singleton instance
export const agentService = new AgentService()
