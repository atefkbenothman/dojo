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
    const userSession = req.userSession
    const aiModel = req.aiModel as LanguageModel
    const parsedInput = req.parsedInput as z.infer<typeof chatInputSchema>
    const { messages } = parsedInput
    const combinedTools = aggregateMcpTools(userSession)
    console.log(
      `[REST /chat/send-message] request received for userId: ${userSession.userId}, using model: ${parsedInput.chat.modelId}`,
    )
    console.log(
      `[REST /chat/send-message]: Using ${Object.keys(combinedTools).length} total tools for userId: ${userSession.userId}`,
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
