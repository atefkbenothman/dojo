import { agentService } from "../../../services/agent/agent"
import { logger } from "../../../lib/logger"
import { asyncHandler, throwError } from "../../../lib/errors"
import { requireSessionMiddleware } from "../../../lib/session"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const agentRouter: Router = express.Router()

const agentInputSchema = z.object({
  messages: z.array(z.any()).min(1, { message: "Missing or invalid messages array" }),
  agent: z.object({
    agentId: z.string(),
  }),
})

agentRouter.post("/run", requireSessionMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validationResult = agentInputSchema.safeParse(req.body)

  if (!validationResult.success) {
    throwError("Invalid input", 400)
  }

  const parsedInput = validationResult.data
  const { agent: agentInfo, messages } = parsedInput

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
}))
