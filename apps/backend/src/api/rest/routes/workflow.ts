import { asyncHandler, throwError } from "../../../lib/errors"
import { logger } from "../../../lib/logger"
import { workflowService } from "../../../services/workflow/workflow"
import { createValidatedRequestMiddleware } from "../middleware"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const workflowRouter: Router = express.Router()

// Schema for stop execution (empty body, just needs session)
const stopExecutionSchema = z.object({})

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
