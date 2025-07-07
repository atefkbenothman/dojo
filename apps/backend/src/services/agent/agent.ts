import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { streamObjectResponse } from "../ai/stream-object"
import { streamTextResponse } from "../ai/stream-text"
import { mcpConnectionManager } from "../mcp/connection-manager"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { CoreMessage, LanguageModel, ToolSet } from "ai"
import type { ConvexHttpClient } from "convex/browser"
import type { Response } from "express"

interface RunAgentParams {
  agentId: string
  messages: CoreMessage[]
  session: Doc<"sessions"> | undefined
  res: Response
  client: ConvexHttpClient
}

interface RunAgentResult {
  success: boolean
  error?: string
}

export class AgentService {
  // Global registry of active executions
  private static executionControllers = new Map<string, AbortController>()

  async runAgent(params: RunAgentParams): Promise<RunAgentResult> {
    const { agentId, messages, session, res, client } = params

    let executionId: Id<"agentExecutions"> | null = null
    const abortController = new AbortController()

    try {
      // Listen for client disconnection
      res.on("close", () => {
        logger.info("Agent", `Client disconnected for agent ${agentId}`)
        abortController.abort()
        // Clean up from registry if we have an execution ID
        if (executionId) {
          AgentService.executionControllers.delete(executionId)
        }
      })

      // Fetch agent
      const agent = await client.query(api.agents.get, { id: agentId as Id<"agents"> })

      if (!agent) {
        return {
          success: false,
          error: `Agent with id ${agentId} not found.`,
        }
      }

      // Validate authentication for agent execution
      if (!agent.isPublic && !session?.userId) {
        return {
          success: false,
          error: "Authentication is required to run private agents.",
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
      const aiModel = await this.getAgentModel(agent, session, client)

      const userIdForLogging = session?.userId || "anonymous"
      logger.info("Agent", `Running agent ${agent._id} for userId: ${userIdForLogging}`)

      // Create execution record if we have a session
      if (session) {
        // Get MCP servers that are currently connected
        const mcpServerIds = agent.mcpServers || []

        executionId = await client.mutation(api.agentExecutions.create, {
          agentId: agent._id,
          sessionId: session._id,
          aiModelId: agent.aiModelId, // Use agent's model
          mcpServerIds,
        })

        // Register the abort controller
        AgentService.executionControllers.set(executionId, abortController)
        logger.info("Agent", `Registered abort controller for execution ${executionId}`)

        // Update status to connecting and establish MCP connections
        await client.mutation(api.agentExecutions.updateStatus, {
          executionId,
          status: "connecting",
        })

        // Establish connections to required MCP servers
        const connectionResult = await mcpConnectionManager.establishMultipleConnections(
          session._id,
          mcpServerIds,
          {
            connectionType: "agent",
            agentExecutionId: executionId,
          },
          client,
        )

        if (!connectionResult.success) {
          throw new Error(`Failed to establish MCP connections: ${connectionResult.error}`)
        }

        // Update status to running
        await client.mutation(api.agentExecutions.updateStatus, {
          executionId,
          status: "running",
        })
      }

      // Get tools after connections are established
      const combinedTools = session ? mcpConnectionManager.aggregateTools(session._id) : {}

      // Filter out any empty messages from frontend
      const filteredMessages = messages.filter(msg => 
        msg.content !== "" && msg.content !== null && msg.content !== undefined
      )
      
      logger.info("Agent", `Received ${messages.length} messages, ${filteredMessages.length} after filtering`)
      
      // Build messages based on execution type (standalone vs workflow)
      const processedMessages = this.constructMessages(agent, filteredMessages)
      
      logger.info("Agent", `Constructed ${processedMessages.length} messages for agent execution`)

      // Execute agent based on output type
      await this.executeAgent({
        agent,
        aiModel,
        messages: processedMessages,
        res,
        combinedTools,
        userIdForLogging,
        abortSignal: abortController.signal,
      })

      // Update execution status to completed
      if (executionId) {
        await client.mutation(api.agentExecutions.updateStatus, {
          executionId,
          status: "completed",
        })
      }

      logger.info("Agent", `Agent ${agent._id} execution completed successfully`)

      return { success: true }
    } catch (error) {
      // Check if it was an abort
      if (error instanceof Error && error.name === "AbortError") {
        logger.info("Agent", `Agent ${agentId} execution was cancelled`)

        if (executionId) {
          await client.mutation(api.agentExecutions.updateStatus, {
            executionId,
            status: "cancelled",
          })
        }

        return {
          success: false,
          error: "Execution cancelled",
        }
      }

      // Update execution status to failed
      if (executionId) {
        await client.mutation(api.agentExecutions.updateStatus, {
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
    } finally {
      // Clean up the controller from registry and agent connections
      if (executionId) {
        AgentService.executionControllers.delete(executionId)
        logger.info("Agent", `Cleaned up abort controller for execution ${executionId}`)
        // Clean up agent-created connections
        await mcpConnectionManager.cleanupAgentConnections(executionId)
      }
    }
  }

  // New method to stop an execution
  async stopExecution(executionId: string, client: ConvexHttpClient): Promise<{ success: boolean; error?: string }> {
    try {
      // First, check if the execution exists and is running
      const execution = await client.query(api.agentExecutions.get, {
        executionId: executionId as Id<"agentExecutions">,
      })

      if (!execution) {
        logger.info("Agent", `Execution ${executionId} not found in database`)
        return {
          success: false,
          error: "Execution not found",
        }
      }

      // Check if execution is in a stoppable state
      if (execution.status !== "preparing" && execution.status !== "connecting" && execution.status !== "running") {
        logger.info("Agent", `Execution ${executionId} is not running (status: ${execution.status})`)
        return {
          success: true, // Return success for idempotency
          error: `Execution already ${execution.status}`,
        }
      }

      // Mark cancellation in database first
      await client.mutation(api.agentExecutions.requestCancellation, {
        executionId: executionId as Id<"agentExecutions">,
      })

      // Update status to cancelled
      await client.mutation(api.agentExecutions.updateStatus, {
        executionId: executionId as Id<"agentExecutions">,
        status: "cancelled",
        error: "Agent execution cancelled by user",
      })

      // Try to get the controller and abort if it exists
      const controller = AgentService.executionControllers.get(executionId)
      if (controller) {
        controller.abort()
        logger.info("Agent", `Aborted execution ${executionId}`)
        // Controller will be cleaned up in the finally block of runAgent
      } else {
        logger.info("Agent", `No active controller for execution ${executionId}, updated database status only`)
      }

      return { success: true }
    } catch (error) {
      logger.error("Agent", `Error stopping execution ${executionId}`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to stop execution",
      }
    }
  }

  private async getAgentModel(
    agent: Doc<"agents">,
    session: Doc<"sessions"> | undefined,
    client: ConvexHttpClient,
  ): Promise<LanguageModel> {
    if (!session) {
      throw new Error("Session is required for agent execution")
    }

    // Use ModelManager to get the model instance (handles API keys, caching, etc.)
    const modelInstance = await modelManager.getModel(agent.aiModelId, client)

    return modelInstance as LanguageModel
  }

  /**
   * Constructs messages based on execution type:
   * - Standalone: Creates new messages from agent's systemPrompt and contextPrompt
   * - Workflow: Uses existing conversation history
   */
  private constructMessages(agent: Doc<"agents">, incomingMessages: CoreMessage[]): CoreMessage[] {
    // For agent execution, we ALWAYS want to use the agent's own system prompt
    // Check if we have any real user messages (not empty)
    const userMessages = incomingMessages.filter(m => 
      m.role === "user" && m.content && m.content.toString().trim() !== ""
    )
    
    // Standalone execution if no real user messages exist
    const isStandalone = userMessages.length === 0
    
    if (isStandalone) {
      // Standalone agent execution - construct messages from agent config
      const messages: CoreMessage[] = []
      
      // Add agent's system message
      messages.push({
        role: "system",
        content: agent.systemPrompt,
      })
      
      // Add user message - use context if available, otherwise a default prompt
      const userContent = agent.contextPrompt?.trim() || 
        "Please execute the instructions provided in your system prompt."
      
      messages.push({
        role: "user",
        content: userContent,
      })
      
      return messages
    } else {
      // Conversation continuation or workflow
      // Replace any existing system message with agent's own system prompt
      const messages: CoreMessage[] = []
      
      // Add agent's system prompt
      messages.push({
        role: "system",
        content: agent.systemPrompt,
      })
      
      // Add all non-system messages from incoming messages
      messages.push(...incomingMessages.filter(m => m.role !== "system"))
      
      return messages
    }
  }

  private async executeAgent(params: {
    agent: Doc<"agents">
    aiModel: LanguageModel
    messages: CoreMessage[]
    res: Response
    combinedTools: ToolSet
    userIdForLogging: string
    abortSignal: AbortSignal
  }): Promise<void> {
    const { agent, aiModel, messages, res, combinedTools, userIdForLogging, abortSignal } = params

    switch (agent.outputType) {
      case "text":
        logger.info("Agent", `Using ${Object.keys(combinedTools).length} total tools for userId: ${userIdForLogging}`)
        await streamTextResponse({
          res,
          languageModel: aiModel,
          messages,
          tools: combinedTools,
          abortSignal,
        })
        break

      case "object":
        await streamObjectResponse({
          res,
          languageModel: aiModel,
          messages,
          abortSignal,
        })
        break

      default:
        throw new Error("Unknown or unhandled output type")
    }
  }
}

// Export singleton instance
export const agentService = new AgentService()
