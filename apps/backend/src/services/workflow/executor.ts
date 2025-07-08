import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { streamObjectResponse } from "../ai/stream-object"
import { streamTextResponse } from "../ai/stream-text"
import { mcpConnectionManager } from "../mcp/connection-manager"
import { api } from "@dojo/db/convex/_generated/api"
import { type Doc, type Id } from "@dojo/db/convex/_generated/dataModel"
import { asyncTryCatch } from "@dojo/utils"
import { type CoreMessage, type LanguageModel, type ToolSet } from "ai"
import type { ConvexHttpClient } from "convex/browser"
import { type Response } from "express"

export interface WorkflowExecutorOptions {
  executionId?: Id<"workflowExecutions">
  sessionId: Id<"sessions">
  abortSignal?: AbortSignal
  client: ConvexHttpClient
}

interface NodeExecutionContext {
  nodeId: string
  tools: ToolSet
  conversationHistory: CoreMessage[]
}

interface WorkflowConversationState {
  messages: CoreMessage[]
  workflowGoal: string
  currentStep: number
}

interface WorkflowExecutionResult {
  success: boolean
  error?: string
}

export class WorkflowExecutor {
  private static readonly HEADERS = {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  } as const

  private workflowNodes: Doc<"workflowNodes">[] = []
  private nodeMap: Map<string, Doc<"workflowNodes">> = new Map()
  private agentMap: Map<string, Doc<"agents">> = new Map()
  private initialMessages: CoreMessage[] = []
  private client: ConvexHttpClient
  private hasAnyNodeFailed = false
  private conversationState: WorkflowConversationState

  constructor(
    private workflow: Doc<"workflows">,
    private nodes: Doc<"workflowNodes">[],
    private res: Response,
    private options: WorkflowExecutorOptions,
  ) {
    this.client = this.options.client

    this.workflowNodes = nodes

    logger.info("Workflow", `Executor initialized:`, {
      workflowId: this.workflow._id.slice(0, 5),
      sessionId: this.options.sessionId.slice(0, 5),
      executionId: this.options.executionId?.slice(0, 5),
      nodeCount: this.workflowNodes.length,
    })

    // Build node map for fast lookup
    this.nodeMap.clear()
    for (const node of this.workflowNodes) {
      this.nodeMap.set(node.nodeId, node)
    }
  }

  async execute(
    initialMessages: CoreMessage[],
    agentMap?: Map<string, Doc<"agents">>,
  ): Promise<WorkflowExecutionResult> {
    const { data, error } = await asyncTryCatch(
      (async () => {
        // Store agent map if provided
        if (agentMap) {
          this.agentMap = agentMap
        }

        // Filter out trigger messages from frontend
        const filteredMessages = initialMessages.filter((msg) => msg.content !== "trigger")

        // Store initial messages for context building
        this.initialMessages = filteredMessages.length > 0 ? filteredMessages : []

        // Set streaming headers once at the start
        Object.entries(WorkflowExecutor.HEADERS).forEach(([key, value]) => {
          this.res.setHeader(key, value)
        })

        // Extract workflow prompt from initial messages or use workflow instructions
        const workflowPromptMessage = this.initialMessages.find((m) => m.role === "user")
        const workflowPrompt = workflowPromptMessage?.content
          ? typeof workflowPromptMessage.content === "string"
            ? workflowPromptMessage.content
            : JSON.stringify(workflowPromptMessage.content)
          : this.workflow.instructions

        // Initialize conversation state for progressive context building
        this.conversationState = {
          messages: [], // Start empty - workflow goal is in system prompt only
          workflowGoal: workflowPrompt,
          currentStep: 0,
        }

        logger.info(
          "Workflow",
          `Initialized conversation state with workflow goal: "${workflowPrompt.slice(0, 100)}...")`,
        )

        logger.info("Workflow", `Starting workflow execution with ${this.workflowNodes.length} nodes`)

        // Start directly in running status (no global connecting phase)
        if (this.options.executionId) {
          await this.client.mutation(api.workflowExecutions.updateStatus, {
            executionId: this.options.executionId,
            status: "running",
          })
        }

        // Use workflow.rootNodeId directly instead of searching - trust database integrity
        if (!this.workflow.rootNodeId) {
          logger.info("Workflow", "Workflow has no root node configured")
          return {
            success: false,
            error: "Workflow is empty. Please add your first step to begin.",
          }
        }

        // Get the root node from our node map
        const rootNode = this.nodeMap.get(this.workflow.rootNodeId)
        if (!rootNode) {
          logger.info("Workflow", `Root node ${this.workflow.rootNodeId} not found in workflow nodes`)
          return {
            success: false,
            error: "Workflow root node is invalid.",
          }
        }

        // Execute workflow tree recursively starting from the root node
        logger.info("Workflow", `Starting workflow execution with 1 root node`)

        // Execute root node recursively (children will execute automatically when parent completes)
        await this.executeNodeRecursively(rootNode, workflowPrompt)

        logger.info("Workflow", "Workflow execution completed")

        // Return success only if no nodes failed
        return {
          success: !this.hasAnyNodeFailed,
          error: this.hasAnyNodeFailed ? "One or more nodes failed" : undefined,
        }
      })().finally(() => {
        // Always end the response gracefully for all return paths
        if (!this.res.writableEnded) {
          this.res.end()
        }
      }),
    )

    // Handle cleanup in both success and error cases
    if (this.options.executionId) {
      await mcpConnectionManager.cleanupWorkflowConnections(this.options.executionId)

      // Assess final workflow status if execution completed successfully
      if (data && data.success && !this.hasAnyNodeFailed) {
        // All nodes completed successfully - mark workflow as completed
        await this.client.mutation(api.workflowExecutions.updateStatus, {
          executionId: this.options.executionId,
          status: "completed",
        })
        logger.info("Workflow", "Marked workflow as completed successfully")
      }
    }

    if (error) {
      logger.error("Workflow", "Unhandled error during workflow execution:", error.message)

      // Track failure state in-memory
      this.hasAnyNodeFailed = true

      // Mark workflow as failed due to unhandled error
      if (this.options.executionId) {
        await this.client.mutation(api.workflowExecutions.updateStatus, {
          executionId: this.options.executionId,
          status: "failed",
          error: `Unhandled error: ${error.message}`,
        })
        logger.info("Workflow", "Marked workflow as failed due to unhandled error")
      }

      if (!this.res.headersSent) {
        this.res.status(500).json({ error: "Internal server error" })
      } else if (!this.res.writableEnded) {
        this.res.end()
      }

      return {
        success: false,
        error: error.message,
      }
    }

    return data
  }

  private async executeNodeRecursively(node: Doc<"workflowNodes">, workflowPrompt: string): Promise<void> {
    const { data, error } = await asyncTryCatch(
      (async () => {
        // Execute this node
        const { agent, tools, context } = await this.prepareNode(node, workflowPrompt)
        const result = await this.executeNode(node, agent, context, workflowPrompt)

        if (result.success) {
          // Get children and execute them immediately in parallel
          const children = this.workflowNodes
            .filter((n) => n.parentNodeId === node.nodeId)
            .sort((a, b) => (a.order || 0) - (b.order || 0))

          if (children.length > 0) {
            logger.info(
              "Workflow",
              `Node ${node.nodeId} completed, starting ${children.length} children: ${children.map((n) => n.nodeId).join(", ")}`,
            )

            // Each child branch executes independently and concurrently
            await Promise.allSettled(children.map((child) => this.executeNodeRecursively(child, workflowPrompt)))
          } else {
            logger.info("Workflow", `Node ${node.nodeId} completed (leaf node)`)
          }
        } else {
          logger.info("Workflow", `Node ${node.nodeId} failed - children will not execute`)
        }
      })(),
    )

    if (error) {
      logger.error("Workflow", `Node ${node.nodeId} failed with error:`, error)

      // Track failure state in-memory
      this.hasAnyNodeFailed = true

      // Mark the failed node status (important for frontend display)
      if (this.options.executionId) {
        await this.updateNodeStatus(node.nodeId, node.agentId, "failed", {
          error: error.message,
        })

        // Cancel all descendant nodes using Convex mutation
        const result = await this.client.mutation(api.workflowExecutions.cancelBranch, {
          executionId: this.options.executionId,
          failedNodeId: node.nodeId,
          reason: `Node failed: ${error.message}`,
        })
        logger.info("Workflow", `Cancelled ${result.cancelledCount} descendant nodes for failed node ${node.nodeId}`)

        // Mark entire workflow as failed when any node fails
        await this.client.mutation(api.workflowExecutions.updateStatus, {
          executionId: this.options.executionId,
          status: "failed",
          error: `Node ${node.nodeId} failed: ${error.message}`,
        })
        logger.info("Workflow", `Marked workflow execution as failed due to node ${node.nodeId} failure`)
      }
    }
  }

  private async prepareNode(
    node: Doc<"workflowNodes">,
    workflowPrompt: string,
  ): Promise<{ agent: Doc<"agents">; tools: ToolSet; context: NodeExecutionContext }> {
    // Get the agent from cache
    const agent = this.agentMap.get(node.agentId)
    if (!agent) {
      throw new Error(`Agent ${node.agentId} not found in cache`)
    }

    // Establish connections and get tools for this specific agent
    const tools = await this.establishStepConnections(agent, node.nodeId)

    // Build progressive context with accumulated conversation history
    const context: NodeExecutionContext = {
      nodeId: node.nodeId,
      tools: tools,
      conversationHistory: this.conversationState.messages, // Use progressive conversation
    }

    return { agent, tools, context }
  }

  private async executeNode(
    node: Doc<"workflowNodes">,
    agent: Doc<"agents">,
    context: NodeExecutionContext,
    workflowPrompt: string,
  ): Promise<{ success: boolean; output?: string }> {
    logger.info("Workflow", `Executing step node: ${node.nodeId}`)

    const { data, error } = await asyncTryCatch(
      (async () => {
        // Update execution tracking
        await this.updateNodeStatus(node.nodeId, node.agentId, "running")

        // Get AI model and execute (includes agent validation)
        const aiModel = await this.getAgentModel(agent)
        const messages = this.buildMessagesWithContext(workflowPrompt, agent, context)

        // Execute based on agent output type
        let result: any
        let output: string

        if (agent.outputType === "text") {
          result = await streamTextResponse({
            res: this.res,
            languageModel: aiModel,
            messages,
            tools: context.tools,
            end: false, // Don't end the response, we have more steps
            abortSignal: this.options.abortSignal,
          })
          output = result.text
        } else {
          result = await streamObjectResponse({
            res: this.res,
            languageModel: aiModel,
            messages,
            end: false, // Don't end the response, we have more steps
            abortSignal: this.options.abortSignal,
          })
          output = JSON.stringify(result.object)
          logger.info("Workflow", `Node ${node.nodeId} object output:`, output)
        }

        // Validate output
        if (output === undefined || output.trim() === "" || output === "null") {
          logger.info("Workflow", `WARNING: Empty ${agent.outputType} response at node ${node.nodeId}`)
          output = ""
        }

        // Mark as completed (with metadata if available)
        await this.updateNodeStatus(node.nodeId, agent._id, "completed", {
          output: output,
          metadata: result.metadata,
        })

        // Add agent output to conversation state for next agents
        this.addAgentOutputToConversation(agent, output)

        return output
      })(),
    )

    if (error) {
      // Mark as failed
      await this.updateNodeStatus(node.nodeId, node.agentId, "failed", {
        error: error.message,
      })

      logger.error("Workflow", `Node ${node.nodeId} execution failed:`, {
        error: error.message,
        stack: error.stack,
      })

      return { success: false }
    }

    return { success: true, output: data }
  }

  private async getAgentModel(agent: Doc<"agents">): Promise<LanguageModel> {
    // Validate agent has required model configuration
    if (!agent.aiModelId) {
      throw new Error(`Agent "${agent.name || agent._id}" has no AI model configured`)
    }

    // Use ModelManager to get the model instance (handles API keys, caching, etc.)
    const modelInstance = await modelManager.getModel(agent.aiModelId, this.client)
    return modelInstance as LanguageModel
  }

  /**
   * Builds XML-structured content for workflow messages.
   * @param type - The type of XML content to build ('system' or 'user')
   * @param agent - The agent configuration (required for system prompts)
   * @param prompt - The user prompt (required for user messages)
   * @param contextPrompt - Optional context for user messages
   */
  private buildWorkflowSystemPrompt(agent: Doc<"agents">): string {
    const systemPrompt = `<workflow>
  <introduction>
    You are part of a multi-agent workflow system. Each agent has a specific role and contributes to achieving the overall goal. You can see the full conversation history to understand what previous agents have accomplished. Your task is to build upon their work and contribute your specialized expertise.
  </introduction>

  <workflow_goal>
    ${this.conversationState.workflowGoal}
  </workflow_goal>

  <workflow_progress>
    You are step ${this.conversationState.currentStep + 1} in this workflow. Previous agents have completed ${this.conversationState.currentStep} steps before you.
  </workflow_progress>

  <current_agent>
    ${agent.systemPrompt}
  </current_agent>

  <instructions>
    - Analyze the conversation history to understand what has been accomplished so far
    - Build upon the work of previous agents rather than starting from scratch
    - Focus on your specific role and expertise as defined in the current_agent section
    - Provide output that will be useful for subsequent agents in the workflow
  </instructions>
</workflow>`

    logger.info(
      "Workflow",
      `Built enhanced system prompt for ${agent.name} (step ${this.conversationState.currentStep + 1})`,
    )

    return systemPrompt
  }

  private buildMessagesWithContext(
    workflowPrompt: string,
    agent: Doc<"agents">,
    context: NodeExecutionContext,
  ): CoreMessage[] {
    const messages: CoreMessage[] = []

    // 1. Add enhanced system prompt with workflow context (includes current agent instructions)
    messages.push({
      role: "system",
      content: this.buildWorkflowSystemPrompt(agent),
    })

    // 2. Add progressive conversation history from previous agents
    messages.push(...context.conversationHistory)

    // 3. Add current agent's instruction as user message (as shown in workflow.md)
    messages.push({
      role: "user",
      content: `You are ${agent.name}. ${agent.systemPrompt}`,
    })

    logger.info(
      "Workflow",
      `Built messages for agent ${agent.name}: ${messages.length} total messages (${context.conversationHistory.length} from previous agents)`,
    )

    // Debug: Log message structure to verify clean conversation flow
    logger.info("Workflow", `Message structure for ${agent.name}:`)
    // messages.forEach((msg, index) => {
    //   const preview = typeof msg.content === "string" ? msg.content.slice(0, 60) + "..." : "[non-string content]"
    //   logger.info("Workflow", `  ${index + 1}. ${msg.role}: "${preview}"`)
    // })

    return messages
  }

  /**
   * Helper method to update workflow node status with consistent error handling.
   * Consolidates the repetitive updateNodeProgress mutation calls.
   */
  private async updateNodeStatus(
    nodeId: string,
    agentId: Id<"agents">,
    status: "pending" | "connecting" | "running" | "completed" | "failed" | "cancelled",
    options?: {
      error?: string
      output?: string
      metadata?: {
        usage?: {
          promptTokens: number
          completionTokens: number
          totalTokens: number
        }
        toolCalls?: Array<{
          toolCallId: string
          toolName: string
          args: any
        }>
        model?: string
        finishReason?: string
      }
    },
  ): Promise<void> {
    if (!this.options.executionId) return

    await this.client.mutation(api.workflowExecutions.updateNodeProgress, {
      executionId: this.options.executionId,
      nodeId,
      agentId,
      status,
      ...options,
    })
  }

  /**
   * Establishes MCP connections required by a specific workflow node.
   * Updates workflow node status and delegates connection management to the connection manager.
   */
  private async establishStepConnections(agent: Doc<"agents">, nodeId: string): Promise<ToolSet> {
    if (!this.options.executionId) {
      logger.info("Workflow", `Skipping MCP connection setup for node ${nodeId} - no execution ID`)
      return mcpConnectionManager.aggregateTools(this.options.sessionId)
    }

    const { data, error } = await asyncTryCatch(
      (async () => {
        const mcpServerIds = agent.mcpServers || []

        logger.info("Workflow", `Setting up MCP connections for node ${nodeId}:`, {
          sessionId: this.options.sessionId,
          mcpServerIds,
          executionId: this.options.executionId,
          usingAuthenticatedClient: true,
        })

        // Update workflow node status to connecting (workflow-specific progress tracking)
        await this.updateNodeStatus(nodeId, agent._id, "connecting")

        // Establish MCP connections (delegated to connection manager)
        const connectionResult = await mcpConnectionManager.establishMultipleConnections(
          this.options.sessionId,
          mcpServerIds,
          {
            workflowExecutionId: this.options.executionId,
            connectionType: "workflow",
          },
          this.client, // Pass authenticated client for MCP server access
        )

        logger.info("Workflow", `MCP connection result for node ${nodeId}:`, {
          success: connectionResult.success,
          error: connectionResult.error,
        })

        if (!connectionResult.success) {
          throw new Error(`Failed to establish MCP connections for node ${nodeId}: ${connectionResult.error}`)
        }

        // Return aggregated tools from all active connections
        return mcpConnectionManager.aggregateTools(this.options.sessionId)
      })(),
    )

    if (error) {
      logger.error("Workflow", `MCP connection setup failed for node ${nodeId}:`, {
        message: error.message,
        stack: error.stack,
        sessionId: this.options.sessionId,
        executionId: this.options.executionId,
      })
      throw error
    }

    return data
  }

  /**
   * Adds agent output to the progressive conversation state.
   * This enables later agents to see what previous agents accomplished.
   */
  private addAgentOutputToConversation(agent: Doc<"agents">, output: string): void {
    // Add user message (agent instructions)
    const userMessage = `You are ${agent.name}. ${agent.systemPrompt}`
    this.conversationState.messages.push({
      role: "user",
      content: userMessage,
    })

    // Add assistant message (agent output)
    this.conversationState.messages.push({
      role: "assistant",
      content: output,
    })

    // Increment step counter
    this.conversationState.currentStep++

    logger.info(
      "Workflow",
      `Total conversation: ${this.conversationState.messages.length} messages (step ${this.conversationState.currentStep})`,
    )
  }
}
