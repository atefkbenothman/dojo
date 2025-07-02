import { asyncHandler, throwError } from "../../../lib/errors"
import { logger } from "../../../lib/logger"
import { requireSessionMiddleware } from "../../../lib/session"
import { workflowService } from "../../../services/workflow/workflow"
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
  }),
})

workflowRouter.post(
  "/run",
  requireSessionMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Parse and validate input
    const validationResult = workflowInputSchema.safeParse(req.body)

    if (!validationResult.success) {
      throwError("Invalid input", 400)
    }

    const parsedInput = validationResult.data
    const { messages, workflow: workflowInfo } = parsedInput

    // Session is guaranteed to exist due to requireSessionMiddleware
    const session = req.session!

    logger.info(
      "REST /workflow/run",
      `request received for userId: ${session.userId || "anonymous"}, workflow: ${workflowInfo.workflowId}`,
    )

    const result = await workflowService.runWorkflow({
      workflowId: workflowInfo.workflowId,
      messages: messages as CoreMessage[],
      session,
      res,
      authorization: req.headers.authorization,
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
  requireSessionMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { executionId } = req.params

    if (!executionId) {
      throwError("Execution ID is required", 400)
    }

    const session = req.session!

    logger.info(
      "REST /workflow/execution/stop",
      `Stop request received for execution: ${executionId}, userId: ${session.userId || "anonymous"}`,
    )

    const result = await workflowService.stopExecution(executionId, req.headers.authorization)

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
