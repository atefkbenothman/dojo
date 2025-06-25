import { asyncHandler, throwError } from "../../../lib/errors"
import { logger } from "../../../lib/logger"
import { requireSessionMiddleware } from "../../../lib/session"
import { agentService } from "../../../services/agent/agent"
import { CoreMessage } from "ai"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const agentRouter: Router = express.Router()

const agentInputSchema = z.object({
  messages: z.array(z.any()).min(1, { message: "Missing or invalid messages array" }),
  agent: z.object({
    agentId: z.string(),
  }),
})

agentRouter.post(
  "/run",
  requireSessionMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validationResult = agentInputSchema.safeParse(req.body)

    if (!validationResult.success) {
      throwError("Invalid input", 400)
    }

    const parsedInput = validationResult.data
    const { agent: agentInfo, messages } = parsedInput as { agent: { agentId: string }; messages: CoreMessage[] }

    // Session is guaranteed to exist due to requireSessionMiddleware
    const session = req.session!

    logger.info(
      "REST /agent/run",
      `request received for userId: ${session.userId || "anonymous"}, agent: ${agentInfo.agentId}`,
    )

    const result = await agentService.runAgent({
      agentId: agentInfo.agentId,
      messages,
      session,
      res,
    })

    if (!result.success) {
      if (result.error?.includes("not found")) {
        throwError(`Agent with id '${agentInfo.agentId}' not found`, 404)
      }
      throw new Error(result.error || "Internal server error")
    }
  }),
)

agentRouter.post(
  "/execution/:executionId/stop",
  requireSessionMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { executionId } = req.params

    if (!executionId) {
      throwError("Execution ID is required", 400)
    }

    const session = req.session!

    logger.info(
      "REST /agent/execution/stop",
      `Stop request received for execution: ${executionId}, userId: ${session.userId || "anonymous"}`,
    )

    const result = await agentService.stopExecution(executionId)

    if (!result.success) {
      if (result.error?.includes("not found")) {
        // Return success even if not found (idempotent)
        res.json({ success: true, message: "Execution already completed or not found" })
        return
      }
      throw new Error(result.error || "Failed to stop execution")
    }

    res.json({ success: true, message: "Execution stop requested" })
  }),
)
