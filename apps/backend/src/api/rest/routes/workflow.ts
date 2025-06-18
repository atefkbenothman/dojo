import { workflowService } from "../../../services/workflow/workflow"
import { logger } from "../../../lib/logger"
import { asyncHandler, throwError } from "../../../lib/errors"
import { requireSessionMiddleware } from "../../../lib/session"
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

workflowRouter.post("/run", requireSessionMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
}))
