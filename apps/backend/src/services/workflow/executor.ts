import { convex } from "../../lib/convex-client"
import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { streamObjectResponse } from "../ai/stream-object"
import { streamTextResponse } from "../ai/stream-text"
import { api } from "@dojo/db/convex/_generated/api"
import { type Doc, type Id } from "@dojo/db/convex/_generated/dataModel"
import { type CoreMessage, type LanguageModel, type ToolSet } from "ai"
import { type Response } from "express"

interface WorkflowExecutorOptions {
  maxRetries?: number
  retryDelay?: number
  persistExecution?: boolean
  executionId?: Id<"workflowExecutions">
  sessionId?: Id<"sessions">
  userId?: Id<"users">
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

  private static readonly SECTIONS = {
    CONTEXT: "=== WORKFLOW CONTEXT ===",
    COMPLETED: "=== COMPLETED STEPS ===",
    CURRENT: "=== CURRENT STEP ===",
  } as const

  // Instance properties
  private completedSteps: CompletedStep[] = []
  private lastStepOutput?: string

  constructor(
    private workflow: Doc<"workflows">,
    private steps: Doc<"agents">[],
    private tools: ToolSet,
    private res: Response,
    private options: WorkflowExecutorOptions = {},
  ) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000, // Start with 1 second
      persistExecution: false,
      ...options,
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

      // Execute each step sequentially
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i]
        if (!step) continue

        this.log(`Executing step ${i + 1}: ${step.name || "Unnamed"}`)

        try {
          await this.executeStepWithRetry(step, i, workflowPrompt, initialMessages)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.log(`Step ${i + 1} failed after all retries:`, errorMessage)

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
    }
  }

  private async executeStepWithRetry(
    step: Doc<"agents">,
    stepIndex: number,
    workflowPrompt: string,
    initialMessages: CoreMessage[],
  ): Promise<void> {
    let lastError: Error | null = null
    const maxRetries = this.options.maxRetries || 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s, 4s...
          const delay = (this.options.retryDelay || 1000) * Math.pow(2, attempt - 1)
          this.log(`Retrying step ${stepIndex + 1} after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        await this.executeStep(step, stepIndex, workflowPrompt, initialMessages)
        return // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.log(`Step ${stepIndex + 1} attempt ${attempt + 1} failed:`, lastError.message)
      }
    }

    // All retries exhausted
    throw lastError || new Error("Step execution failed")
  }

  private async executeStep(
    step: Doc<"agents">,
    stepIndex: number,
    workflowPrompt: string,
    initialMessages: CoreMessage[],
  ): Promise<void> {
    // Update step status to running
    if (this.options.executionId) {
      await convex.mutation(api.workflowExecutions.updateStepProgress, {
        executionId: this.options.executionId,
        stepIndex,
        agentId: step._id,
        status: "running",
      })
    }

    try {
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

      this.log(`Messages for step ${stepIndex + 1}:`, {
        system: systemMessage.content,
        user: userMessage.content,
      })

      // Execute based on output type
      if (step.outputType === "text") {
        await this.executeTextStep(step, stepIndex, currentStepMessages, aiModel)
      } else if (step.outputType === "object") {
        await this.executeObjectStep(step, stepIndex, currentStepMessages, aiModel)
      } else {
        throw new Error("Unknown output type")
      }

      // After successful execution, update step status
      if (this.options.executionId) {
        await convex.mutation(api.workflowExecutions.updateStepProgress, {
          executionId: this.options.executionId,
          stepIndex,
          agentId: step._id,
          status: "completed",
        })
      }
    } catch (error) {
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
    const text = await streamTextResponse({
      res: this.res,
      languageModel: aiModel,
      messages,
      tools: this.tools,
      end: false, // Don't end the response, we have more steps
    })

    this.log(`Step ${stepIndex + 1} text output:`, text)

    if (!this.isValidStepOutput(text)) {
      this.log(`WARNING: Empty text response at step ${stepIndex + 1}`)
    } else {
      this.lastStepOutput = text
      this.completedSteps.push({
        instructions: step.systemPrompt,
        output: text,
      })
    }
  }

  private async executeObjectStep(
    step: Doc<"agents">,
    stepIndex: number,
    messages: CoreMessage[],
    aiModel: LanguageModel,
  ): Promise<void> {
    // Use streamObjectResponse with returnObject flag to get the complete object
    const object = await streamObjectResponse({
      res: this.res,
      languageModel: aiModel,
      messages,
      end: false, // Don't end the response, we have more steps
    })

    const objectContent = JSON.stringify(object)
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
    const completedStepsSection = this.formatCompletedSteps()

    return (
      `${WorkflowExecutor.SECTIONS.CONTEXT}\n${workflowPrompt}\n\n` +
      `${WorkflowExecutor.SECTIONS.COMPLETED}\n${completedStepsSection}\n\n` +
      `${WorkflowExecutor.SECTIONS.CURRENT}\nStep ${stepIndex + 1}: ${
        currentStep.name || ""
      }\nInstructions: ${currentStep.systemPrompt}`
    )
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
}

// Export the logging function for external use
export function logWorkflow(message: string, data?: unknown): void {
  if (data !== undefined) {
    logger.info("REST /workflow/run", message, data)
  } else {
    logger.info("REST /workflow/run", message)
  }
}
