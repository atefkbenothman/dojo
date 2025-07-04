import { asyncHandler, throwError } from "../../../lib/errors"
import { logger } from "../../../lib/logger"
import { modelManager } from "../../../services/ai/model-manager"
import { streamTextResponse } from "../../../services/ai/stream-text"
import { mcpConnectionManager } from "../../../services/mcp/connection-manager"
import { createValidatedRequestMiddleware } from "../middleware"
import type { LanguageModel, CoreMessage } from "ai"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const chatRouter: Router = express.Router()

const chatInputSchema = z.object({
  messages: z.array(z.any()).min(1, { message: "Missing or invalid messages array" }),
  chat: z.object({
    modelId: z.string().min(1, { message: "Missing modelId" }),
  }),
})

chatRouter.post(
  "/",
  createValidatedRequestMiddleware(chatInputSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Session and parsedInput are guaranteed to exist due to middleware
    const session = req.session
    const parsedInput = req.parsedInput as z.infer<typeof chatInputSchema>
    const { messages } = parsedInput

    // Extract and validate modelId
    const modelId = parsedInput.chat?.modelId
    if (!modelId) {
      throwError("Missing modelId in chat object", 400)
    }

    const userIdForLogging = session.userId || "anonymous"

    logger.info("REST /chat/send-message", `request received for userId: ${userIdForLogging}, using model: ${modelId}`)

    const modelInstance = await modelManager.getModel(modelId, req.client)

    const aiModel = modelInstance as LanguageModel
    const combinedTools = mcpConnectionManager.aggregateTools(session._id)

    logger.info(
      "REST /chat/send-message",
      `Using ${Object.keys(combinedTools).length} total tools for userId: ${userIdForLogging}`,
    )

    await streamTextResponse({
      res,
      languageModel: aiModel,
      messages: messages as CoreMessage[],
      tools: combinedTools,
    })
  }),
)
