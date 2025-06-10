import { streamTextResponse } from "../ai/stream-text-response.js"
import { aggregateMcpTools } from "../mcp-connection.js"
import { createAiRequestMiddleware } from "./middleware.js"
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

chatRouter.post("/", createAiRequestMiddleware(chatInputSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session
    const aiModel = req.aiModel as LanguageModel
    const parsedInput = req.parsedInput as z.infer<typeof chatInputSchema>
    const { messages } = parsedInput

    const userIdForLogging = session?.userId || "anonymous"
    const combinedTools = session ? aggregateMcpTools(session._id) : {}

    console.log(
      `[REST /chat/send-message] request received for userId: ${userIdForLogging}, using model: ${parsedInput.chat.modelId}`,
    )
    console.log(
      `[REST /chat/send-message]: Using ${Object.keys(combinedTools).length} total tools for userId: ${userIdForLogging}`,
    )
    await streamTextResponse({
      res,
      languageModel: aiModel,
      messages: messages as CoreMessage[],
      tools: combinedTools,
    })
  } catch (error) {
    console.error("[REST /chat/send-message] Unhandled error:", error)
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" })
    }
  }
})
