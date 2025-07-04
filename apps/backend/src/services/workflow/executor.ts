import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { streamObjectResponse } from "../ai/stream-object"
import { streamTextResponse } from "../ai/stream-text"
import { mcpConnectionManager } from "../mcp/connection-manager"
import { api } from "@dojo/db/convex/_generated/api"
import { type Doc, type Id } from "@dojo/db/convex/_generated/dataModel"
import { type CoreMessage, type LanguageModel, type ToolSet } from "ai"
import type { ConvexHttpClient } from "convex/browser"
import { type Response } from "express"

interface WorkflowExecutorOptions {
  persistExecution?: boolean
  executionId?: Id<"workflowExecutions">
  sessionId: Id<"sessions">
  abortSignal?: AbortSignal
  client: ConvexHttpClient
}

interface CompletedNode {
  instructions: string
  output?: string
  nodeId: string
  agentName: string
  success: boolean
}

interface NodeExecutionContext {
  nodeId: string
  tools: ToolSet
  conversationHistory: CoreMessage[]
  parentChain: string[]
}

interface WorkflowExecutionResult {
  success: boolean
  completedNodes: CompletedNode[]
  error?: string
}

export class WorkflowExecutor {
  private static readonly HEADERS = {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  } as const

  // Instance properties (read-only state only)
  private hasError: boolean = false
  private workflowNodes: Doc<"workflowNodes">[] = []
  private nodeMap: Map<string, Doc<"workflowNodes">> = new Map()
  private initialMessages: CoreMessage[] = []
  private client: ConvexHttpClient

  constructor(
    private workflow: Doc<"workflows">,
    private nodes: Doc<"workflowNodes">[],
    private res: Response,
    private options: WorkflowExecutorOptions,
  ) {
    this.options = {
      persistExecution: false,
      ...options,
    }

    // Use the provided client
    this.client = this.options.client

    this.workflowNodes = nodes
    this.buildNodeMap()

    // Listen for abort signal to handle cleanup
    if (this.options.abortSignal) {
      this.options.abortSignal.addEventListener("abort", () => {
        void this.handleAbort()
      })
    }
  }

  private buildNodeMap(): void {
    this.nodeMap.clear()
    for (const node of this.workflowNodes) {
      this.nodeMap.set(node.nodeId, node)
    }
  }

  private getParentChain(node: Doc<"workflowNodes">): string[] {
    const chain: string[] = []
    let current = node.parentNodeId

    while (current) {
      chain.unshift(current) // Add to front for correct order
      const parentNode = this.nodeMap.get(current)
      current = parentNode?.parentNodeId
    }

    return chain
  }

  private buildBranchHistory(node: Doc<"workflowNodes">, completedNodes: Map<string, CompletedNode>): CoreMessage[] {
    const history = [...this.initialMessages]
    const ancestorChain = this.getAncestorChain(node)

    // Add ALL ancestor outputs in order (full branch history)
    for (const ancestorId of ancestorChain) {
      const ancestorResult = completedNodes.get(ancestorId)
      if (ancestorResult && ancestorResult.output) {
        history.push({
          role: "assistant",
          content: `[${ancestorResult.agentName}]: ${ancestorResult.output}`,
        })
      }
    }

    return history
  }

  private getAncestorChain(node: Doc<"workflowNodes">): string[] {
    const chain: string[] = []
    let current = node.parentNodeId

    // Build the full chain from root to immediate parent
    while (current) {
      chain.unshift(current) // Add to front for correct order (root first)
      const parentNode = this.nodeMap.get(current)
      current = parentNode?.parentNodeId
    }

    return chain
  }

  async execute(initialMessages: CoreMessage[]): Promise<WorkflowExecutionResult> {
    try {
      // Store initial messages for context building
      this.initialMessages = initialMessages

      // Set streaming headers once at the start
      Object.entries(WorkflowExecutor.HEADERS).forEach(([key, value]) => {
        this.res.setHeader(key, value)
      })

      // Extract workflow prompt from initial messages
      const workflowPromptMessage = initialMessages.find((m) => m.role === "user")
      const workflowPrompt =
        typeof workflowPromptMessage?.content === "string"
          ? workflowPromptMessage.content
          : JSON.stringify(workflowPromptMessage?.content) || ""

      this.log(`Starting workflow execution with ${this.workflowNodes.length} nodes`)

      // Start directly in running status (no global connecting phase)
      if (this.options.executionId) {
        await this.client.mutation(api.workflowExecutions.updateStatus, {
          executionId: this.options.executionId,
          status: "running",
        })
      }

      // Find root nodes (nodes with no parent)
      const rootNodes = this.workflowNodes.filter((n) => !n.parentNodeId)
      if (rootNodes.length === 0) {
        this.log("Workflow is empty - no nodes to execute")

        // End the response gracefully
        if (!this.res.writableEnded) {
          this.res.end()
        }

        return {
          success: false,
          completedNodes: [],
          error: "Workflow is empty. Please add your first step to begin.",
        }
      }

      // Execute tree using event-driven execution starting from all root nodes
      const completedNodes = await this.executeEventDriven(rootNodes, workflowPrompt)

      // Check if any nodes failed
      const failedNodes = completedNodes.filter((node) => !node.success)
      const success = failedNodes.length === 0

      // All steps completed
      if (!this.res.writableEnded) {
        this.res.end()
      }

      if (success) {
        this.log("Workflow execution completed successfully")
      } else {
        this.log(`Workflow execution completed with ${failedNodes.length} failed nodes`)
      }

      return {
        success: success,
        completedNodes: completedNodes,
        error: success ? undefined : `${failedNodes.length} node(s) failed during execution`,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log("Unhandled error during workflow execution:", errorMessage)

      if (!this.res.headersSent) {
        this.res.status(500).json({ error: "Internal server error" })
      } else if (!this.res.writableEnded) {
        this.res.end()
      }

      return {
        success: false,
        completedNodes: [], // No completed nodes in error case
        error: errorMessage,
      }
    } finally {
      // Cleanup workflow-specific MCP connections
      if (this.options.executionId) {
        await mcpConnectionManager.cleanupWorkflowConnections(this.options.executionId)
      }
    }
  }

  private async executeEventDriven(
    rootNodes: Doc<"workflowNodes">[],
    workflowPrompt: string,
  ): Promise<CompletedNode[]> {
    const completedNodes = new Map<string, CompletedNode>()
    const allCompletedNodes: CompletedNode[] = []
    const failedBranches = new Set<string>() // Track failed branch root nodes

    // Use a simple breadth-first approach with proper async/await
    // This is simpler and more reliable than trying to do event-driven with .then/.catch
    const queue: Doc<"workflowNodes">[] = [...rootNodes]
    const inProgress = new Set<string>()

    this.log(`Starting workflow execution with ${queue.length} root nodes`)

    while (queue.length > 0 || inProgress.size > 0) {
      // Start all nodes that are ready to run
      const readyNodes: Doc<"workflowNodes">[] = []
      for (let i = queue.length - 1; i >= 0; i--) {
        const node = queue[i]
        if (!node) continue

        // Check if this node's dependencies are met
        if (this.canNodeRun(node, completedNodes, failedBranches, inProgress)) {
          readyNodes.push(node)
          queue.splice(i, 1) // Remove from queue
        }
      }

      // Execute all ready step nodes (children execute after parent completes)
      if (readyNodes.length > 0) {
        this.log(`Executing ${readyNodes.length} step nodes: ${readyNodes.map((n) => n.nodeId).join(", ")}`)

        const nodePromises = readyNodes.map(async (node) => {
          // All nodes are step nodes now
          inProgress.add(node.nodeId)
          try {
            const result = await this.executeNodeEventDriven(node, completedNodes, failedBranches, workflowPrompt)
            completedNodes.set(result.nodeId, result)
            allCompletedNodes.push(result)

            if (result.success) {
              // Add children to queue
              const children = await this.getChildNodes(node.nodeId)
              queue.push(...children)
              this.log(`Node ${node.nodeId} completed, added ${children.length} children to queue`)
            } else {
              // Mark branch as failed
              const branchRoot = this.getBranchRoot(node)
              failedBranches.add(branchRoot)
              this.log(`Node ${node.nodeId} failed, marked branch ${branchRoot} as failed`)
            }
          } catch (error) {
            this.log(`Node ${node.nodeId} failed with error:`, error)
            const branchRoot = this.getBranchRoot(node)
            failedBranches.add(branchRoot)
            await this.markBranchAsSkipped(
              node.nodeId,
              `Node failed: ${error instanceof Error ? error.message : String(error)}`,
            )
          } finally {
            inProgress.delete(node.nodeId)
          }
        })

        // Wait for this batch to complete
        await Promise.all(nodePromises)
      } else if (inProgress.size === 0) {
        // No nodes ready and none in progress - we're done or stuck
        if (queue.length > 0) {
          this.log(
            `WARNING: ${queue.length} nodes remain in queue but cannot run:`,
            queue.map((n) => n.nodeId),
          )
        }
        break
      } else {
        // Nodes in progress, wait a bit
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }

    this.log(`Workflow execution completed. ${allCompletedNodes.length} nodes executed successfully`)
    return allCompletedNodes
  }

  private async getChildNodes(nodeId: string): Promise<Doc<"workflowNodes">[]> {
    return this.workflowNodes.filter((n) => n.parentNodeId === nodeId).sort((a, b) => (a.order || 0) - (b.order || 0)) // Respect order for deterministic execution
  }

  private canNodeRun(
    node: Doc<"workflowNodes">,
    completedNodes: Map<string, CompletedNode>,
    failedBranches: Set<string>,
    inProgress: Set<string>,
  ): boolean {
    // Don't run if already in progress
    if (inProgress.has(node.nodeId)) {
      return false
    }

    // Check if this node's branch has failed
    const branchRoot = this.getBranchRoot(node)
    if (failedBranches.has(branchRoot)) {
      return false
    }

    // If this node has no parent, it can run (root node)
    if (!node.parentNodeId) {
      return true
    }

    // Check if parent has completed successfully
    const parentCompleted = completedNodes.get(node.parentNodeId)
    return parentCompleted !== undefined && parentCompleted.success
  }

  private async executeNodeEventDriven(
    node: Doc<"workflowNodes">,
    completedNodes: Map<string, CompletedNode>,
    failedBranches: Set<string>,
    workflowPrompt: string,
  ): Promise<CompletedNode> {
    // Check if this node's branch has already failed
    const branchRoot = this.getBranchRoot(node)
    if (failedBranches.has(branchRoot)) {
      throw new Error(`Branch starting from ${branchRoot} has failed`)
    }

    // Get the agent for tools setup
    const agent = await this.client.query(api.agents.get, { id: node.agentId })
    if (!agent) {
      throw new Error(`Agent ${node.agentId} not found`)
    }

    // Establish connections and get tools for this specific agent
    const tools = await this.establishStepConnections(agent, node.nodeId)

    // Build branch-scoped context
    const context: NodeExecutionContext = {
      nodeId: node.nodeId,
      tools: tools,
      conversationHistory: this.buildBranchHistory(node, completedNodes),
      parentChain: this.getParentChain(node),
    }

    return await this.executeNodeWithContext(node, context, workflowPrompt, agent)
  }

  private getBranchRoot(node: Doc<"workflowNodes">): string {
    let current = node
    while (current.parentNodeId) {
      const parent = this.nodeMap.get(current.parentNodeId)
      if (!parent) break
      current = parent
    }
    return current.nodeId
  }

  private async markBranchAsSkipped(nodeId: string, reason: string): Promise<void> {
    const descendants = this.getAllDescendants(nodeId)

    for (const descendant of descendants) {
      if (this.options.executionId) {
        await this.client.mutation(api.workflowExecutions.updateNodeProgress, {
          executionId: this.options.executionId,
          nodeId: descendant.nodeId,
          agentId: descendant.agentId,
          status: "cancelled",
          error: reason,
        })
      }
    }
  }

  private getAllDescendants(nodeId: string): Doc<"workflowNodes">[] {
    const descendants: Doc<"workflowNodes">[] = []
    const queue = [nodeId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const children = this.workflowNodes.filter((n) => n.parentNodeId === currentId)

      for (const child of children) {
        descendants.push(child)
        queue.push(child.nodeId)
      }
    }

    return descendants
  }

  private async executeNodeWithContext(
    node: Doc<"workflowNodes">,
    context: NodeExecutionContext,
    workflowPrompt: string,
    agent: Doc<"agents">,
  ): Promise<CompletedNode> {
    this.log(`Executing step node: ${node.nodeId}`)

    try {
      // Validate agent has required model
      if (!agent.aiModelId) {
        throw new Error(`Agent ${agent.name || node.agentId} has no AI model configured`)
      }

      // Update execution tracking
      if (this.options.executionId) {
        await this.client.mutation(api.workflowExecutions.updateNodeProgress, {
          executionId: this.options.executionId,
          nodeId: node.nodeId,
          agentId: node.agentId,
          status: "running",
        })
      }

      // Get AI model and execute
      const aiModel = await this.getAgentModel(agent)
      const messages = this.buildMessagesWithContext(workflowPrompt, agent, context)

      let stepOutput: string = ""
      if (agent.outputType === "text") {
        stepOutput = await this.executeTextStep(agent, node, messages, aiModel, context)
      } else {
        stepOutput = await this.executeObjectStep(agent, node, messages, aiModel, context)
      }

      // Mark as completed
      if (this.options.executionId) {
        await this.client.mutation(api.workflowExecutions.updateNodeProgress, {
          executionId: this.options.executionId,
          nodeId: node.nodeId,
          agentId: node.agentId,
          status: "completed",
          output: stepOutput,
        })
      }

      return {
        nodeId: node.nodeId,
        agentName: agent.name || `Agent ${node.nodeId}`,
        instructions: agent.systemPrompt,
        output: stepOutput,
        success: true,
      }
    } catch (error) {
      // Set error flag to prevent abort handler from marking as cancelled
      this.hasError = true

      // Mark as failed
      if (this.options.executionId) {
        await this.client.mutation(api.workflowExecutions.updateNodeProgress, {
          executionId: this.options.executionId,
          nodeId: node.nodeId,
          agentId: node.agentId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        })
      }

      return {
        nodeId: node.nodeId,
        agentName: `Agent ${node.nodeId}`,
        instructions: "",
        output: "",
        success: false,
      }
    }
  }

  private async getAgentModel(agent: Doc<"agents">): Promise<LanguageModel> {
    // Use ModelManager to get the model instance (handles API keys, caching, etc.)
    const modelInstance = await modelManager.getModel(agent.aiModelId, this.client)

    return modelInstance as LanguageModel
  }

  private buildMessagesWithContext(
    workflowPrompt: string,
    agent: Doc<"agents">,
    context: NodeExecutionContext,
  ): CoreMessage[] {
    const messages: CoreMessage[] = []

    // Check if workflow instructions are already in the conversation history as a system message
    const hasWorkflowInstructions = context.conversationHistory.some(
      (m) => m.role === "system" && m.content.includes(this.workflow.instructions),
    )

    // Only add agent's system prompt, avoiding duplicate workflow instructions
    if (hasWorkflowInstructions) {
      // Just add the agent's prompt
      messages.push({
        role: "system",
        content: agent.systemPrompt,
      })
    } else {
      // Add combined workflow instructions and agent prompt
      messages.push({
        role: "system",
        content: `${this.workflow.instructions}\n\n${agent.systemPrompt}`,
      })
    }

    // Add conversation history from context (includes parent chain)
    messages.push(...context.conversationHistory)

    // Add current workflow prompt if not already in history
    const hasUserPrompt = context.conversationHistory.some((m) => m.role === "user")
    if (!hasUserPrompt) {
      messages.push({
        role: "user",
        content: workflowPrompt,
      })
    }

    // Ensure the last message is always a user or tool message for API compatibility
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === "assistant") {
      // Add a continuation prompt to ensure compatibility with APIs like Perplexity
      messages.push({
        role: "user",
        content: "Continue processing based on the above context.",
      })
    }

    return messages
  }

  private async executeTextStep(
    agent: Doc<"agents">,
    node: Doc<"workflowNodes">,
    messages: CoreMessage[],
    aiModel: LanguageModel,
    context: NodeExecutionContext,
  ): Promise<string> {
    try {
      const result = await streamTextResponse({
        res: this.res,
        languageModel: aiModel,
        messages,
        tools: context.tools,
        end: false, // Don't end the response, we have more steps
        abortSignal: this.options.abortSignal,
      })

      if (!this.isValidStepOutput(result.text)) {
        this.log(`WARNING: Empty text response at node ${node.nodeId}`)
        return ""
      }

      // Store metadata if available
      if (this.options.executionId && result.metadata) {
        await this.client.mutation(api.workflowExecutions.updateNodeProgress, {
          executionId: this.options.executionId,
          nodeId: node.nodeId,
          agentId: agent._id,
          status: "completed",
          output: result.text,
          metadata: result.metadata,
        })
      }

      return result.text
    } catch (error) {
      this.log(`Error in executeTextStep for node ${node.nodeId}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error // Re-throw to be caught by executeNodeWithContext
    }
  }

  private async executeObjectStep(
    agent: Doc<"agents">,
    node: Doc<"workflowNodes">,
    messages: CoreMessage[],
    aiModel: LanguageModel,
    context: NodeExecutionContext,
  ): Promise<string> {
    try {
      // Use streamObjectResponse with returnObject flag to get the complete object
      const result = await streamObjectResponse({
        res: this.res,
        languageModel: aiModel,
        messages,
        end: false, // Don't end the response, we have more steps
        abortSignal: this.options.abortSignal,
      })

      const objectContent = JSON.stringify(result.object)
      this.log(`Node ${node.nodeId} object output:`, objectContent)

      if (!this.isValidStepOutput(objectContent)) {
        this.log(`WARNING: Empty object response at node ${node.nodeId}`)
        return ""
      }

      // Store metadata if available
      if (this.options.executionId && result.metadata) {
        await this.client.mutation(api.workflowExecutions.updateNodeProgress, {
          executionId: this.options.executionId,
          nodeId: node.nodeId,
          agentId: agent._id,
          status: "completed",
          output: objectContent,
          metadata: result.metadata,
        })
      }

      return objectContent
    } catch (error) {
      this.log(`Error in executeObjectStep for node ${node.nodeId}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error // Re-throw to be caught by executeNodeWithContext
    }
  }

  // Helper methods

  private isValidStepOutput(output: string | undefined): boolean {
    return output !== undefined && output.trim() !== "" && output !== "null"
  }

  private log(message: string, data?: unknown): void {
    if (data !== undefined) {
      logger.info("Workflow", message, data)
    } else {
      logger.info("Workflow", message)
    }
  }

  /**
   * Establishes MCP connections required by a specific step.
   * Returns the updated tools available after connections.
   */
  private async establishStepConnections(agent: Doc<"agents">, nodeId: string): Promise<ToolSet> {
    if (!this.options.executionId) {
      this.log(`Skipping MCP connection setup for node ${nodeId} - no execution ID`)
      return {}
    }

    try {
      const mcpServerIds = agent.mcpServers || []

      if (mcpServerIds.length === 0) {
        this.log(`Node ${nodeId} requires no MCP servers`)
        // Return existing tools for this session
        return mcpConnectionManager.aggregateTools(this.options.sessionId)
      }

      this.log(`Node ${nodeId} requires ${mcpServerIds.length} MCP servers`)

      // Update node status to connecting
      await this.client.mutation(api.workflowExecutions.updateNodeProgress, {
        executionId: this.options.executionId,
        nodeId: nodeId,
        agentId: agent._id,
        status: "connecting",
      })

      // Establish connections to all required servers
      const connectionResult = await mcpConnectionManager.establishMultipleConnections(
        this.options.sessionId,
        mcpServerIds,
        {
          workflowExecutionId: this.options.executionId,
          connectionType: "workflow",
        },
      )

      if (!connectionResult.success) {
        throw new Error(`Failed to establish MCP connections for node ${nodeId}: ${connectionResult.error}`)
      }

      // Get updated tools after establishing new connections
      const tools = mcpConnectionManager.aggregateTools(this.options.sessionId)
      this.log(`Node ${nodeId}: Updated tools after connections: ${Object.keys(tools).length} total tools`)

      return tools
    } catch (error) {
      this.log(`MCP connection setup failed for node ${nodeId}:`, error)
      throw error
    }
  }

  private async handleAbort(): Promise<void> {
    this.log("Workflow aborted, cleaning up running nodes")

    // Don't update status if we're already in an error state
    if (this.hasError) {
      this.log("Skipping abort status update due to existing error state")
      return
    }

    // Mark any currently running nodes as cancelled
    if (this.options.executionId) {
      try {
        // Check for running nodes and mark them as cancelled
        const execution = await this.client.query(api.workflowExecutions.get, {
          executionId: this.options.executionId,
        })

        if (execution && execution.currentNodes.length > 0) {
          this.log(`Cancelling ${execution.currentNodes.length} running nodes`)

          // Mark all currently running nodes as cancelled
          for (const nodeId of execution.currentNodes) {
            const node = this.nodeMap.get(nodeId)
            if (node) {
              await this.client.mutation(api.workflowExecutions.updateNodeProgress, {
                executionId: this.options.executionId,
                nodeId: nodeId,
                agentId: node.agentId,
                status: "cancelled",
                error: "Workflow cancelled",
              })
            }
          }
        }
      } catch (error) {
        this.log("Error updating node status on abort:", error)
      }
    }

    // Also cleanup workflow-specific connections on abort
    if (this.options.executionId) {
      await mcpConnectionManager.cleanupWorkflowConnections(this.options.executionId)
    }
  }
}

// Export the logging function for external use
export function logWorkflow(message: string, data?: unknown): void {
  if (data !== undefined) {
    logger.info("REST /workflow/run", message, data)
  } else {
    logger.info("REST /workflow/run", message)
  }
}
