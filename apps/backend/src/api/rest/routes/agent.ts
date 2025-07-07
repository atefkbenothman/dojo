import { asyncHandler, throwError } from "../../../lib/errors"
import { logger } from "../../../lib/logger"
import { agentService } from "../../../services/agent/agent"
import { createValidatedRequestMiddleware } from "../middleware"
import { CoreMessage } from "ai"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const agentRouter: Router = express.Router()

const agentInputSchema = z.object({
  messages: z.array(z.any()), // Allow empty array for standalone agent execution
  agent: z.object({
    agentId: z.string(),
  }),
})

// Schema for stop execution (empty body, just needs session)
const stopExecutionSchema = z.object({})

agentRouter.post(
  "/run",
  createValidatedRequestMiddleware(agentInputSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { session, client } = req
    const parsedInput = req.parsedInput as z.infer<typeof agentInputSchema>
    const { agent: agentInfo, messages } = parsedInput

    logger.info(
      "REST /agent/run",
      `request received for userId: ${session.userId || "anonymous"}, agent: ${agentInfo.agentId}`,
    )

    const result = await agentService.runAgent({
      agentId: agentInfo.agentId,
      messages: messages as CoreMessage[],
      session,
      res,
      client,
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
  createValidatedRequestMiddleware(stopExecutionSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { executionId } = req.params

    if (!executionId) {
      throwError("Execution ID is required", 400)
    }

    const { session, client } = req

    logger.info(
      "REST /agent/execution/stop",
      `Stop request received for execution: ${executionId}, userId: ${session.userId || "anonymous"}`,
    )

    const result = await agentService.stopExecution(executionId, client)

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
