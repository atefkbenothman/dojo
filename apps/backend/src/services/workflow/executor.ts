import { convex } from "../../lib/convex-client"
import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { mcpConnectionManager } from "../mcp/connection-manager"
import { streamObjectResponse } from "../ai/stream-object"
import { streamTextResponse } from "../ai/stream-text"
import { api } from "@dojo/db/convex/_generated/api"
import { type Doc, type Id } from "@dojo/db/convex/_generated/dataModel"
import { type CoreMessage, type LanguageModel, type ToolSet } from "ai"
import { type Response } from "express"

interface WorkflowExecutorOptions {
  persistExecution?: boolean
  executionId?: Id<"workflowExecutions">
  sessionId?: Id<"sessions">
  userId?: Id<"users">
  abortSignal?: AbortSignal
}

interface CompletedStep {
  instructions: string
  output?: string
}

interface WorkflowExecutionResult {
  success: boolean
  completedSteps: CompletedStep[]
  error?: string
}

export class WorkflowExecutor {
  // Constants
  private static readonly LOG_PREFIX = "[REST /workflow/run]" as const

  private static readonly HEADERS = {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  } as const

  // Instance properties
  private completedSteps: CompletedStep[] = []
  private lastStepOutput?: string
  private currentStepIndex?: number
  private hasError: boolean = false

  constructor(
    private workflow: Doc<"workflows">,
    private steps: Doc<"agents">[],
    private tools: ToolSet,
    private res: Response,
    private options: WorkflowExecutorOptions = {},
  ) {
    this.options = {
      persistExecution: false,
      ...options,
    }

    // Listen for abort signal to handle cleanup
    if (this.options.abortSignal) {
      this.options.abortSignal.addEventListener("abort", () => {
        this.handleAbort()
      })
    }
  }

  async execute(initialMessages: CoreMessage[]): Promise<WorkflowExecutionResult> {
    try {
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

      this.log(`Starting workflow execution with ${this.steps.length} steps`)

      // Note: MCP connections are now established per-step as needed
      // Initialize tools from any existing connections
      if (this.options.sessionId) {
        this.tools = mcpConnectionManager.aggregateTools(this.options.sessionId)
        this.log(`Starting with ${Object.keys(this.tools).length} existing tools`)
      }

      // Start directly in running status (no global connecting phase)
      if (this.options.executionId) {
        await convex.mutation(api.workflowExecutions.updateStatus, {
          executionId: this.options.executionId,
          status: "running",
        })
      }

      // Execute each step sequentially
      for (let i = 0; i < this.steps.length; i++) {
        // Check for cancellation before each step (graceful cancellation)
        if (this.options.abortSignal?.aborted) {
          this.log(`Workflow cancelled before step ${i + 1}`)

          // Update status to cancelled
          if (this.options.executionId) {
            await convex.mutation(api.workflowExecutions.updateStatus, {
              executionId: this.options.executionId,
              status: "cancelled",
              error: `Workflow cancelled after completing ${i} steps`,
            })
          }

          return {
            success: false,
            completedSteps: this.completedSteps,
            error: `Workflow cancelled after completing ${i} steps`,
          }
        }

        const step = this.steps[i]
        if (!step) continue

        this.log(`Executing step ${i + 1}: ${step.name || "Unnamed"}`)

        try {
          await this.executeStep(step, i, workflowPrompt, initialMessages)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.log(`Step ${i + 1} failed:`, errorMessage)

          // Stop on first error
          return {
            success: false,
            completedSteps: this.completedSteps,
            error: `Step ${i + 1} failed: ${errorMessage}`,
          }
        }
      }

      // All steps completed successfully
      if (!this.res.writableEnded) {
        this.res.end()
      }

      this.log("Workflow execution completed successfully")
      return {
        success: true,
        completedSteps: this.completedSteps,
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
        completedSteps: this.completedSteps,
        error: errorMessage,
      }
    } finally {
      // Cleanup workflow-specific MCP connections
      if (this.options.executionId) {
        await mcpConnectionManager.cleanupWorkflowConnections(this.options.executionId)
      }
    }
  }

  private async executeStep(
    step: Doc<"agents">,
    stepIndex: number,
    workflowPrompt: string,
    initialMessages: CoreMessage[],
  ): Promise<void> {
    // Track current step
    this.currentStepIndex = stepIndex

    try {
      // First, establish required MCP connections for this step
      this.tools = await this.establishStepConnections(step, stepIndex)

      // Update step status to running (after connections are established)
      if (this.options.executionId) {
        await convex.mutation(api.workflowExecutions.updateStepProgress, {
          executionId: this.options.executionId,
          stepIndex,
          agentId: step._id,
          status: "running",
        })
      }
      // Get the AI model for this specific agent
      const aiModel = await this.getAgentModel(step)

      // Build messages for this step
      const systemMessage: CoreMessage = {
        role: "system",
        content: this.buildSystemMessage(workflowPrompt, step, stepIndex),
      }

      const userMessage = this.buildUserMessage(stepIndex, workflowPrompt)

      // Filter conversation history (exclude system messages and empty content)
      const conversationHistory = initialMessages.filter(
        (m) =>
          m.role !== "system" &&
          typeof m.content === "string" &&
          !m.content.startsWith("Starting workflow") &&
          m.content.trim() !== "",
      )

      const currentStepMessages: CoreMessage[] = [systemMessage, ...conversationHistory, userMessage]

      // this.log(`Messages for step ${stepIndex + 1}:`, {
      //   system: systemMessage.content,
      //   user: userMessage.content,
      // })

      // Execute based on output type
      if (step.outputType === "text") {
        await this.executeTextStep(step, stepIndex, currentStepMessages, aiModel)
      } else if (step.outputType === "object") {
        await this.executeObjectStep(step, stepIndex, currentStepMessages, aiModel)
      } else {
        throw new Error("Unknown output type")
      }

      // Note: Status update with metadata is now handled in executeTextStep/executeObjectStep

      // Clear current step index after successful completion
      this.currentStepIndex = undefined
    } catch (error) {
      // Set error flag to prevent abort handler from marking as cancelled
      this.hasError = true

      // Update step status on error
      if (this.options.executionId) {
        await convex.mutation(api.workflowExecutions.updateStepProgress, {
          executionId: this.options.executionId,
          stepIndex,
          agentId: step._id,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Clear current step index
      this.currentStepIndex = undefined

      throw error // Re-throw to maintain existing error handling
    }
  }

  private async getAgentModel(agent: Doc<"agents">): Promise<LanguageModel> {
    // Get the session object for ModelManager
    if (!this.options.sessionId) {
      throw new Error("Session ID is required for agent model initialization")
    }

    const session = await convex.query(api.sessions.get, { sessionId: this.options.sessionId })
    if (!session) {
      throw new Error(`Session ${this.options.sessionId} not found`)
    }

    // Use ModelManager to get the model instance (handles API keys, caching, etc.)
    const modelInstance = await modelManager.getModel(agent.aiModelId, session)

    return modelInstance as LanguageModel
  }

  private async executeTextStep(
    step: Doc<"agents">,
    stepIndex: number,
    messages: CoreMessage[],
    aiModel: LanguageModel,
  ): Promise<void> {
    try {
      const result = await streamTextResponse({
        res: this.res,
        languageModel: aiModel,
        messages,
        tools: this.tools,
        end: false, // Don't end the response, we have more steps
        abortSignal: this.options.abortSignal,
      })

      // this.log(`Step ${stepIndex + 1} text output:`, result.text)

      if (!this.isValidStepOutput(result.text)) {
        this.log(`WARNING: Empty text response at step ${stepIndex + 1}`)
      } else {
        this.lastStepOutput = result.text
        this.completedSteps.push({
          instructions: step.systemPrompt,
          output: result.text,
        })
      }

      // Store metadata if available
      if (this.options.executionId && result.metadata) {
        await convex.mutation(api.workflowExecutions.updateStepProgress, {
          executionId: this.options.executionId,
          stepIndex,
          agentId: step._id,
          status: "completed",
          output: this.lastStepOutput,
          metadata: result.metadata,
        })
      }
    } catch (error) {
      this.log(`Error in executeTextStep for step ${stepIndex + 1}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error // Re-throw to be caught by executeStep
    }
  }

  private async executeObjectStep(
    step: Doc<"agents">,
    stepIndex: number,
    messages: CoreMessage[],
    aiModel: LanguageModel,
  ): Promise<void> {
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
      this.log(`Step ${stepIndex + 1} object output:`, objectContent)

      if (!this.isValidStepOutput(objectContent)) {
        this.log(`WARNING: Empty object response at step ${stepIndex + 1}`)
      } else {
        this.lastStepOutput = objectContent
        this.completedSteps.push({
          instructions: step.systemPrompt,
          output: objectContent,
        })
      }

      // Store metadata if available
      if (this.options.executionId && result.metadata) {
        await convex.mutation(api.workflowExecutions.updateStepProgress, {
          executionId: this.options.executionId,
          stepIndex,
          agentId: step._id,
          status: "completed",
          output: this.lastStepOutput,
          metadata: result.metadata,
        })
      }
    } catch (error) {
      this.log(`Error in executeObjectStep for step ${stepIndex + 1}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error // Re-throw to be caught by executeStep
    }
  }

  // Helper methods
  private formatCompletedSteps(): string {
    if (this.completedSteps.length === 0) {
      return "None"
    }

    return this.completedSteps
      .map(
        (step, idx) =>
          `Step ${idx + 1} Instructions: ${step.instructions}${step.output ? `\nOutput: ${step.output}` : ""}`,
      )
      .join("\n\n")
  }

  private buildSystemMessage(
    workflowPrompt: string,
    currentStep: { name?: string; systemPrompt: string },
    stepIndex: number,
  ): string {
    return `<workflow_context>
    ${workflowPrompt}
</workflow_context>

<completed_steps>
${this.formatCompletedSteps()}
</completed_steps>

<current_step>
Step ${stepIndex + 1}: ${currentStep.name || ""}
Instructions: ${currentStep.systemPrompt}
</current_step>`
  }

  private buildUserMessage(stepIndex: number, workflowPrompt: string): { role: "user"; content: string } {
    if (stepIndex === 0) {
      return { role: "user", content: workflowPrompt }
    }

    return {
      role: "user",
      content: `Output from previous step:\n${this.lastStepOutput || "No output from previous step."}`,
    }
  }

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
   * Analyzes which MCP servers are required for a specific step.
   */
  private async getRequiredServersForStep(step: Doc<"agents">): Promise<Array<{ id: Id<"mcp">, name: string }>> {
    const requiredServers: Array<{ id: Id<"mcp">, name: string }> = []
    
    if (!step.mcpServers || step.mcpServers.length === 0) {
      return requiredServers
    }

    // Get server configurations
    const serverPromises = step.mcpServers.map(async (serverId) => {
      try {
        const server = await convex.query(api.mcp.get, { id: serverId })
        return server ? { id: serverId, name: server.name } : null
      } catch (error) {
        this.log(`Error fetching MCP server ${serverId}:`, error)
        return null
      }
    })

    const serverDetails = (await Promise.all(serverPromises)).filter(s => s !== null)
    return serverDetails
  }

  /**
   * Establishes MCP connections required by a specific step.
   * Returns the updated tools available after connections.
   */
  private async establishStepConnections(
    step: Doc<"agents">, 
    stepIndex: number
  ): Promise<ToolSet> {
    if (!this.options.sessionId || !this.options.executionId) {
      this.log(`Skipping MCP connection setup for step ${stepIndex + 1} - no session or execution ID`)
      return this.tools
    }

    try {
      const requiredServers = await this.getRequiredServersForStep(step)
      
      if (requiredServers.length === 0) {
        this.log(`Step ${stepIndex + 1} requires no MCP servers`)
        return this.tools
      }

      this.log(`Step ${stepIndex + 1} requires ${requiredServers.length} MCP servers: ${requiredServers.map(s => s.name).join(', ')}`)
      
      // Update step status to connecting
      await convex.mutation(api.workflowExecutions.updateStepProgress, {
        executionId: this.options.executionId,
        stepIndex,
        agentId: step._id,
        status: "connecting",
      })


      // Connect to each required server
      for (const server of requiredServers) {
        await this.connectToStepServer(server.id, server.name, stepIndex)
      }

      // Refresh tools after establishing new connections
      this.tools = mcpConnectionManager.aggregateTools(this.options.sessionId)
      this.log(`Step ${stepIndex + 1}: Updated tools after connections: ${Object.keys(this.tools).length} total tools`)

      return this.tools
    } catch (error) {
      this.log(`MCP connection setup failed for step ${stepIndex + 1}:`, error)
      throw error
    }
  }

  /**
   * Connects to a single MCP server for a specific step.
   */
  private async connectToStepServer(
    serverId: Id<"mcp">, 
    serverName: string, 
    stepIndex: number
  ): Promise<void> {
    try {
      // Check if we're already connected to this server
      const existingConnection = mcpConnectionManager.getConnection(this.options.sessionId!, serverId)
      if (existingConnection) {
        this.log(`Step ${stepIndex + 1}: Already connected to ${serverName}, reusing connection`)
        return
      }


      // Get server configuration
      const server = await convex.query(api.mcp.get, { id: serverId })
      if (!server) {
        throw new Error(`Server ${serverId} not found`)
      }

      // Establish the actual connection
      const result = await mcpConnectionManager.establishConnection(
        this.options.sessionId!,
        server,
        this.options.userId,
        {
          workflowExecutionId: this.options.executionId,
          connectionType: "workflow",
        }
      )

      if (result.success) {
        this.log(`Step ${stepIndex + 1}: Successfully connected to MCP server: ${serverName}`)
      } else {
        throw new Error(`Failed to connect to ${serverName}: ${result.error}`)
      }
    } catch (error) {
      throw error
    }
  }



  private async handleAbort(): Promise<void> {
    this.log("Workflow aborted, cleaning up running steps")

    // Don't update status if we're already in an error state
    if (this.hasError) {
      this.log("Skipping abort status update due to existing error state")
      return
    }

    // If we have a current step that's running, mark it as cancelled
    if (this.options.executionId && this.currentStepIndex !== undefined) {
      const currentStep = this.steps[this.currentStepIndex]
      if (currentStep) {
        try {
          // First check if the step has already been marked as failed
          const execution = await convex.query(api.workflowExecutions.get, {
            executionId: this.options.executionId,
          })

          if (execution?.stepExecutions) {
            const stepExecution = execution.stepExecutions.find((se: any) => se.stepIndex === this.currentStepIndex)

            // Only update to cancelled if the step hasn't already been marked as failed
            if (stepExecution?.status !== "failed") {
              await convex.mutation(api.workflowExecutions.updateStepProgress, {
                executionId: this.options.executionId,
                stepIndex: this.currentStepIndex,
                agentId: currentStep._id,
                status: "cancelled",
                error: "Workflow cancelled",
              })
            }
          }
        } catch (error) {
          this.log("Error updating step status on abort:", error)
        }
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
