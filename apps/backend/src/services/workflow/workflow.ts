import { convex } from "../../lib/convex-client"
import { aggregateMcpTools } from "../mcp/connection"
import { logWorkflow, WorkflowExecutor } from "./executor"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { CoreMessage, LanguageModel } from "ai"
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
  maxRetries?: number
  retryDelay?: number
  persistExecution?: boolean
  executionId?: Id<"workflowExecutions">
  sessionId?: Id<"sessions">
  userId?: Id<"users">
}

export class WorkflowService {
  private static readonly LOG_PREFIX = "[WorkflowService]"

  private readonly defaultExecutorOptions: WorkflowExecutorOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    persistExecution: true,
  }

  async runWorkflow(params: RunWorkflowParams): Promise<RunWorkflowResult> {
    const { workflowId, messages, session, res } = params
    let executionId: Id<"workflowExecutions"> | null = null

    try {
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
      }

      // Prepare execution context
      const userIdForLogging = session?.userId || "anonymous"
      const combinedTools = session ? aggregateMcpTools(session._id) : {}

      logWorkflow(`Starting workflow ${workflow._id} for userId: ${userIdForLogging}, steps: ${steps.length}`)

      // Check if there are any active MCP connections for logging
      if (Object.keys(combinedTools).length > 0) {
        logWorkflow(`Using ${Object.keys(combinedTools).length} total tools`)
      }

      // Execute workflow with execution tracking
      const executor = new WorkflowExecutor(workflow, steps, combinedTools, res, {
        ...this.defaultExecutorOptions,
        executionId: executionId || undefined,
        sessionId: session?._id,
        userId: session?.userId || undefined,
      })

      const result = await executor.execute(messages)

      // Update final status
      if (executionId) {
        await convex.mutation(api.workflowExecutions.updateStatus, {
          executionId,
          status: result.success ? "completed" : "failed",
          error: result.error,
        })
      }

      return {
        success: result.success,
        completedSteps: result.completedSteps.length,
        error: result.error,
      }
    } catch (error) {
      // Update status on error
      if (executionId) {
        await convex.mutation(api.workflowExecutions.updateStatus, {
          executionId,
          status: "failed",
          error: error instanceof Error ? error.message : "Internal server error",
        })
      }

      console.error(`${WorkflowService.LOG_PREFIX} Unhandled error:`, error)
      return {
        success: false,
        completedSteps: 0,
        error: error instanceof Error ? error.message : "Internal server error",
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
      console.error(`${WorkflowService.LOG_PREFIX} Error fetching workflow:`, error)
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
      console.error(`${WorkflowService.LOG_PREFIX} Error fetching workflow steps:`, error)
      return []
    }
  }
}

// Export singleton instance
export const workflowService = new WorkflowService()
