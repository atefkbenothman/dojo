import { logger } from "../../lib/logger"
import { mcpConnectionManager } from "../mcp/connection-manager"
import { WorkflowExecutor, type WorkflowExecutorOptions } from "./executor"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { CoreMessage } from "ai"
import type { ConvexHttpClient } from "convex/browser"
import type { Response } from "express"

interface RunWorkflowParams {
  workflowId: string
  messages: CoreMessage[]
  session: Doc<"sessions">
  res: Response
  client: ConvexHttpClient
}

interface RunWorkflowResult {
  success: boolean
  completedSteps: number
  error?: string
}

export class WorkflowService {
  private static readonly LOG_PREFIX = "[WorkflowService]"

  // Global registry of active workflow executions
  private static executionControllers = new Map<string, AbortController>()

  private readonly defaultExecutorOptions: Partial<WorkflowExecutorOptions> = {
    persistExecution: true,
  }

  async runWorkflow(params: RunWorkflowParams): Promise<RunWorkflowResult> {
    const { workflowId, messages, session, res, client } = params

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

      // Fetch workflow - trust that it's valid since validation is done in Convex
      const workflow = await this.fetchWorkflow(workflowId, client)
      if (!workflow) {
        return {
          success: false,
          completedSteps: 0,
          error: `Workflow with id ${workflowId} not found.`,
        }
      }

      // Fetch workflow nodes - trust that structure is valid since validation is done in Convex
      const nodes = await this.fetchWorkflowNodes(workflow, client)
      if (nodes.length === 0) {
        return {
          success: false,
          completedSteps: 0,
          error: "Workflow has no nodes.",
        }
      }

      // Create execution record
      executionId = await client.mutation(api.workflowExecutions.create, {
        workflowId: workflow._id,
        sessionId: session._id,
        totalSteps: nodes.length, // All nodes are step nodes now
        agentIds: nodes.map((n) => n.agentId),
      })

      // Register the abort controller
      WorkflowService.executionControllers.set(executionId, abortController)
      logger.info("Workflow", `Registered abort controller for execution ${executionId}`)

      // Prepare execution context
      const userIdForLogging = session.userId || "anonymous"

      // Note: Tools will be dynamically aggregated after workflow connections are established
      const combinedTools = mcpConnectionManager.aggregateTools(session._id)

      logger.info(
        "Workflow",
        `Starting workflow ${workflow._id} for userId: ${userIdForLogging}, nodes: ${nodes.length}`,
      )

      // Check if there are any active MCP connections for logging
      if (Object.keys(combinedTools).length > 0) {
        logger.info("Workflow", `Using ${Object.keys(combinedTools).length} existing tools`)
      }

      // Execute workflow with execution tracking
      const executor = new WorkflowExecutor(workflow, nodes, res, {
        ...this.defaultExecutorOptions,
        executionId: executionId || undefined,
        sessionId: session._id,
        abortSignal: abortController.signal,
        client,
      })

      const result = await executor.execute(messages)

      // Update final status only if not already cancelled
      if (executionId) {
        // Check if the execution was cancelled
        const execution = await client.query(api.workflowExecutions.get, { executionId })

        // Only update status if it's not already cancelled
        if (execution && execution.status !== "cancelled") {
          await client.mutation(api.workflowExecutions.updateStatus, {
            executionId,
            status: result.success ? "completed" : "failed",
            error: result.error,
          })
        }
      }

      return {
        success: result.success,
        completedSteps: result.completedNodes.length,
        error: result.error,
      }
    } catch (error) {
      // Check if it was an abort
      if (error instanceof Error && error.name === "AbortError") {
        logger.info("Workflow", `Workflow ${workflowId} execution was cancelled`)

        if (executionId) {
          await client.mutation(api.workflowExecutions.updateStatus, {
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
        await client.mutation(api.workflowExecutions.updateStatus, {
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

  async stopExecution(executionId: string, client: ConvexHttpClient): Promise<{ success: boolean; error?: string }> {
    try {
      // First, check if the execution exists and is running
      const execution = await client.query(api.workflowExecutions.get, {
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
      await client.mutation(api.workflowExecutions.requestCancellation, {
        executionId: executionId as Id<"workflowExecutions">,
        strategy: "graceful", // Default to graceful for workflows
      })

      // Update status to cancelled
      await client.mutation(api.workflowExecutions.updateStatus, {
        executionId: executionId as Id<"workflowExecutions">,
        status: "cancelled",
        error: "Workflow cancelled by user",
      })

      // Update any running nodes to cancelled
      for (const nodeId of execution.currentNodes) {
        const nodeExecution = execution.nodeExecutions.find((ne) => ne.nodeId === nodeId)
        if (nodeExecution && nodeExecution.status === "running") {
          await client.mutation(api.workflowExecutions.updateNodeProgress, {
            executionId: executionId as Id<"workflowExecutions">,
            nodeId: nodeId,
            agentId: nodeExecution.agentId,
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

  private async fetchWorkflow(workflowId: string, client: ConvexHttpClient): Promise<Doc<"workflows"> | null> {
    try {
      const workflow = await client.query(api.workflows.get, {
        id: workflowId as Id<"workflows">,
      })
      return workflow
    } catch (error) {
      logger.error("Workflow", "Error fetching workflow", error)
      return null
    }
  }

  private async fetchWorkflowNodes(
    workflow: Doc<"workflows">,
    client: ConvexHttpClient,
  ): Promise<Doc<"workflowNodes">[]> {
    try {
      const nodes = await client.query(api.workflows.getWorkflowNodes, {
        workflowId: workflow._id,
      })

      if (nodes.length === 0) {
        logger.info("Workflow", `No nodes found for workflow ${workflow._id}`)
        return []
      }

      return nodes
    } catch (error) {
      logger.error("Workflow", "Error fetching workflow nodes", error)
      return []
    }
  }
}

// Export singleton instance
export const workflowService = new WorkflowService()
