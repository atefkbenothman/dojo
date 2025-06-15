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
  aiModel: LanguageModel
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
}

export class WorkflowService {
  private static readonly LOG_PREFIX = "[WorkflowService]"

  private readonly defaultExecutorOptions: WorkflowExecutorOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    persistExecution: false, // TODO: Implement persistence
  }

  async runWorkflow(params: RunWorkflowParams): Promise<RunWorkflowResult> {
    const { workflowId, messages, session, aiModel, res } = params

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

      // Prepare execution context
      const userIdForLogging = session?.userId || "anonymous"
      const combinedTools = session ? aggregateMcpTools(session._id) : {}

      logWorkflow(`Starting workflow ${workflow._id} for userId: ${userIdForLogging}, steps: ${steps.length}`)

      if (session?.activeMcpServerIds) {
        logWorkflow(`Using ${Object.keys(combinedTools).length} total tools`)
      }

      // Execute workflow
      const result = await this.executeWorkflow({
        workflow,
        steps,
        aiModel,
        combinedTools,
        res,
        messages,
      })

      return {
        success: result.success,
        completedSteps: result.completedSteps.length,
        error: result.error,
      }
    } catch (error) {
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

  private async executeWorkflow(params: {
    workflow: Doc<"workflows">
    steps: Doc<"agents">[]
    aiModel: LanguageModel
    combinedTools: any
    res: Response
    messages: CoreMessage[]
  }) {
    const { workflow, steps, aiModel, combinedTools, res, messages } = params

    const executor = new WorkflowExecutor(workflow, steps, aiModel, combinedTools, res, this.defaultExecutorOptions)

    const result = await executor.execute(messages)

    // Log the final result
    if (result.success) {
      logWorkflow(`Workflow completed successfully with ${result.completedSteps.length} steps`)
    } else {
      logWorkflow(`Workflow failed: ${result.error}`)
    }

    return result
  }
}

// Export singleton instance
export const workflowService = new WorkflowService()
