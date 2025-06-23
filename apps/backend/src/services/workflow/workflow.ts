import { convex } from "../../lib/convex-client"
import { logger } from "../../lib/logger"
import { mcpConnectionManager } from "../mcp/connection-manager"
import { logWorkflow, WorkflowExecutor } from "./executor"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { CoreMessage } from "ai"
import type { Response } from "express"

interface RunWorkflowParams {
  workflowId: string
  messages: CoreMessage[]
  session: Doc<"sessions"> | undefined
  res: Response
}

interface RunWorkflowResult {
  success: boolean
  completedSteps: number
  error?: string
}

interface WorkflowExecutorOptions {
  persistExecution?: boolean
  executionId?: Id<"workflowExecutions">
  sessionId?: Id<"sessions">
  userId?: Id<"users">
  abortSignal?: AbortSignal
}

export class WorkflowService {
  private static readonly LOG_PREFIX = "[WorkflowService]"

  // Global registry of active workflow executions
  private static executionControllers = new Map<string, AbortController>()

  private readonly defaultExecutorOptions: WorkflowExecutorOptions = {
    persistExecution: true,
  }

  async runWorkflow(params: RunWorkflowParams): Promise<RunWorkflowResult> {
    const { workflowId, messages, session, res } = params
    let executionId: Id<"workflowExecutions"> | null = null
    const abortController = new AbortController()

    try {
      // Listen for client disconnection
      res.on("close", () => {
        logger.info("Workflow", `Client disconnected for workflow ${workflowId}`)
        abortController.abort()
        // Clean up from registry if we have an execution ID
        if (executionId) {
          WorkflowService.executionControllers.delete(executionId)
        }
      })

      // Fetch and validate workflow
      const workflow = await this.fetchWorkflow(workflowId)
      if (!workflow) {
        return {
          success: false,
          completedSteps: 0,
          error: `Workflow with id ${workflowId} not found.`,
        }
      }

      // Fetch and validate workflow steps
      const steps = await this.fetchWorkflowSteps(workflow)
      if (steps.length === 0) {
        return {
          success: false,
          completedSteps: 0,
          error: "Workflow has no valid steps.",
        }
      }

      // Pre-validate that all agents have models
      for (const step of steps) {
        if (!step.aiModelId) {
          return {
            success: false,
            completedSteps: 0,
            error: `Agent "${step.name}" does not have an AI model configured.`,
          }
        }
      }

      // Create execution record if we have a session
      if (session) {
        executionId = await convex.mutation(api.workflowExecutions.create, {
          workflowId: workflow._id,
          sessionId: session._id,
          userId: session.userId || undefined,
          totalSteps: steps.length,
          agentIds: steps.map((step) => step._id),
        })

        // Update status to running
        await convex.mutation(api.workflowExecutions.updateStatus, {
          executionId,
          status: "running",
        })

        // Register the abort controller
        WorkflowService.executionControllers.set(executionId, abortController)
        logger.info("Workflow", `Registered abort controller for execution ${executionId}`)
      }

      // Prepare execution context
      const userIdForLogging = session?.userId || "anonymous"
      
      // Note: Tools will be dynamically aggregated after workflow connections are established
      const combinedTools = session ? mcpConnectionManager.aggregateTools(session._id) : {}

      logWorkflow(`Starting workflow ${workflow._id} for userId: ${userIdForLogging}, steps: ${steps.length}`)

      // Check if there are any active MCP connections for logging
      if (Object.keys(combinedTools).length > 0) {
        logWorkflow(`Using ${Object.keys(combinedTools).length} existing tools`)
      }

      // Execute workflow with execution tracking
      const executor = new WorkflowExecutor(workflow, steps, combinedTools, res, {
        ...this.defaultExecutorOptions,
        executionId: executionId || undefined,
        sessionId: session?._id,
        userId: session?.userId || undefined,
        abortSignal: abortController.signal,
      })

      const result = await executor.execute(messages)

      // Update final status only if not already cancelled
      if (executionId) {
        // Check if the execution was cancelled
        const execution = await convex.query(api.workflowExecutions.get, { executionId })

        // Only update status if it's not already cancelled
        if (execution && execution.status !== "cancelled") {
          await convex.mutation(api.workflowExecutions.updateStatus, {
            executionId,
            status: result.success ? "completed" : "failed",
            error: result.error,
          })
        }
      }

      return {
        success: result.success,
        completedSteps: result.completedSteps.length,
        error: result.error,
      }
    } catch (error) {
      // Check if it was an abort
      if (error instanceof Error && error.name === "AbortError") {
        logger.info("Workflow", `Workflow ${workflowId} execution was cancelled`)

        if (executionId) {
          await convex.mutation(api.workflowExecutions.updateStatus, {
            executionId,
            status: "cancelled",
          })
        }

        return {
          success: false,
          completedSteps: 0,
          error: "Execution cancelled",
        }
      }

      // Update status on error
      if (executionId) {
        await convex.mutation(api.workflowExecutions.updateStatus, {
          executionId,
          status: "failed",
          error: error instanceof Error ? error.message : "Internal server error",
        })
      }

      logger.error("Workflow", "Unhandled error", error)
      return {
        success: false,
        completedSteps: 0,
        error: error instanceof Error ? error.message : "Internal server error",
      }
    } finally {
      // Clean up the controller from registry
      if (executionId) {
        WorkflowService.executionControllers.delete(executionId)
        logger.info("Workflow", `Cleaned up abort controller for execution ${executionId}`)
      }
    }
  }

  // New method to stop a workflow execution
  async stopExecution(executionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First, check if the execution exists and is running
      const execution = await convex.query(api.workflowExecutions.get, {
        executionId: executionId as Id<"workflowExecutions">,
      })

      if (!execution) {
        logger.info("Workflow", `Execution ${executionId} not found in database`)
        return {
          success: false,
          error: "Execution not found",
        }
      }

      // Check if execution is in a stoppable state
      if (execution.status !== "preparing" && execution.status !== "running") {
        logger.info("Workflow", `Execution ${executionId} is not running (status: ${execution.status})`)
        return {
          success: true, // Return success for idempotency
          error: `Execution already ${execution.status}`,
        }
      }

      // Mark cancellation in database first
      await convex.mutation(api.workflowExecutions.requestCancellation, {
        executionId: executionId as Id<"workflowExecutions">,
        strategy: "graceful", // Default to graceful for workflows
      })

      // Update status to cancelled
      await convex.mutation(api.workflowExecutions.updateStatus, {
        executionId: executionId as Id<"workflowExecutions">,
        status: "cancelled",
        error: "Workflow cancelled by user",
      })

      // Update any running steps to cancelled
      if (execution.currentStep !== undefined && execution.stepExecutions) {
        const currentStepExecution = execution.stepExecutions[execution.currentStep]
        if (currentStepExecution && currentStepExecution.status === "running") {
          await convex.mutation(api.workflowExecutions.updateStepProgress, {
            executionId: executionId as Id<"workflowExecutions">,
            stepIndex: execution.currentStep,
            agentId: currentStepExecution.agentId,
            status: "cancelled",
            error: "Workflow cancelled",
          })
        }
      }

      // Try to get the controller and abort if it exists
      const controller = WorkflowService.executionControllers.get(executionId)
      if (controller) {
        controller.abort()
        logger.info("Workflow", `Aborted execution ${executionId} (graceful cancellation)`)
        // Controller will be cleaned up in the finally block of runWorkflow
      } else {
        logger.info("Workflow", `No active controller for execution ${executionId}, updated database status only`)
      }

      return { success: true }
    } catch (error) {
      logger.error("Workflow", `Error stopping execution ${executionId}`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to stop execution",
      }
    }
  }

  private async fetchWorkflow(workflowId: string): Promise<Doc<"workflows"> | null> {
    try {
      const workflow = await convex.query(api.workflows.get, {
        id: workflowId as Id<"workflows">,
      })
      return workflow
    } catch (error) {
      logger.error("Workflow", "Error fetching workflow", error)
      return null
    }
  }

  private async fetchWorkflowSteps(workflow: Doc<"workflows">): Promise<Doc<"agents">[]> {
    try {
      const agentDocs = await Promise.all(
        workflow.steps.map((agentId: Id<"agents">) => convex.query(api.agents.get, { id: agentId })),
      )

      const validSteps = agentDocs.filter((agent): agent is Doc<"agents"> => agent !== null)

      if (validSteps.length !== workflow.steps.length) {
        logWorkflow(
          `WARNING: Some agents for workflow ${workflow._id} were not found. ` +
            `Expected ${workflow.steps.length}, got ${validSteps.length}`,
        )
      }

      return validSteps
    } catch (error) {
      logger.error("Workflow", "Error fetching workflow steps", error)
      return []
    }
  }
}

// Export singleton instance
export const workflowService = new WorkflowService()
