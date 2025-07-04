import { asyncHandler, throwError } from "../../../lib/errors"
import { logger } from "../../../lib/logger"
import { workflowService } from "../../../services/workflow/workflow"
import { createValidatedRequestMiddleware } from "../middleware"
import type { CoreMessage } from "ai"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const workflowRouter: Router = express.Router()

const workflowInputSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.string(),
          content: z.unknown(),
        })
        .passthrough(),
    )
    .min(1, { message: "Missing or invalid messages array" }),
  workflow: z.object({
    workflowId: z.string(),
    modelId: z.string().min(1, { message: "Missing modelId" }),
  }),
})

// Schema for stop execution (empty body, just needs session)
const stopExecutionSchema = z.object({})

workflowRouter.post(
  "/run",
  createValidatedRequestMiddleware(workflowInputSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Session, parsedInput, and client are guaranteed to exist due to middleware
    const session = req.session
    const parsedInput = req.parsedInput as z.infer<typeof workflowInputSchema>
    const { messages, workflow: workflowInfo } = parsedInput

    // Extract and validate modelId
    const modelId = workflowInfo?.modelId
    if (!modelId) {
      throwError("Missing modelId in workflow object", 400)
    }

    logger.info(
      "REST /workflow/run",
      `request received for userId: ${session.userId || "anonymous"}, workflow: ${workflowInfo.workflowId}`,
    )

    const result = await workflowService.runWorkflow({
      workflowId: workflowInfo.workflowId,
      messages: messages as CoreMessage[],
      session,
      res,
      client: req.client,
    })

    if (!result.success) {
      if (result.error?.includes("not found")) {
        throwError(`Workflow with id '${workflowInfo.workflowId}' not found`, 404)
      }
      if (result.error?.includes("no valid steps")) {
        throwError("Workflow has no valid steps", 400)
      }
      throw new Error(result.error || "Internal server error")
    }
    // Note: The WorkflowExecutor handles streaming responses and ending the response
    // So we don't need to do anything here for successful executions
  }),
)

workflowRouter.post(
  "/execution/:executionId/stop",
  createValidatedRequestMiddleware(stopExecutionSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { executionId } = req.params

    if (!executionId) {
      throwError("Execution ID is required", 400)
    }

    const { session, client } = req

    logger.info(
      "REST /workflow/execution/stop",
      `Stop request received for execution: ${executionId}, userId: ${session.userId || "anonymous"}`,
    )

    const result = await workflowService.stopExecution(executionId, client)

    if (!result.success) {
      if (result.error?.includes("not found")) {
        // Return success even if not found (idempotent)
        res.json({ success: true, message: "Execution already completed or not found" })
        return
      }
      throw new Error(result.error || "Failed to stop execution")
    }

    res.json({ success: true, message: "Workflow stop requested (graceful cancellation)" })
  }),
)
