import { getModelInstance } from "../ai/get-model.js"
import { streamTextResponse } from "../ai/stream-text-response.js"
import { getOrCreateUserSession } from "../core.js"
import { AI_MODELS, CoreMessageSchema } from "@dojo/config"
import { tryCatch } from "@dojo/utils"
import type { LanguageModel, ToolSet, CoreMessage, ImageModel } from "ai"
import "dotenv/config"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const chatRouter: Router = express.Router()

const chatInputSchema = z.object({
  messages: z.array(CoreMessageSchema).min(1, { message: "Missing or invalid messages array" }),
  modelId: z.string().min(1, { message: "Missing modelId" }),
  apiKey: z.string().optional(),
})

chatRouter.post("/send-message", async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = chatInputSchema.safeParse(req.body)
    if (!validationResult.success) {
      res.status(400).json({ error: "Invalid input", details: validationResult.error.formErrors })
      return
    }

    const { messages, modelId, apiKey: providedApiKey } = validationResult.data

    const userId = req.headers["x-user-id"] as string | undefined
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      res.status(401).json({ error: "User ID is missing or invalid in X-User-Id header." })
      return
    }

    const userSession = getOrCreateUserSession(userId)
    if (!userSession) {
      res.status(500).json({ error: "Failed to get or create user session." })
      return
    }

    let apiKey = providedApiKey
    if (!apiKey && AI_MODELS[modelId]?.requiresApiKey === false) {
      apiKey = process.env.GROQ_API_KEY_FALLBACK
    }

    if (!apiKey) {
      res.status(400).json({ error: "Missing API key." })
      return
    }

    const { data: modelInstance, error: modelError } = tryCatch(getModelInstance(modelId, apiKey))
    if (modelError || !modelInstance) {
      res.status(400).json({
        error: `Failed to initialize AI model '${modelId}'. Please check your API key and try again.`,
      })
      return
    }

    const aiModel = modelInstance as LanguageModel

    console.log(`[REST /chat/send-message] request received for userId: ${userSession.userId}, using model: ${modelId}`)

    const combinedTools: ToolSet = {}
    if (userSession.activeMcpClients) {
      for (const mcpClient of userSession.activeMcpClients.values()) {
        const clientTools = mcpClient.client.tools || {}
        Object.assign(combinedTools, clientTools)
      }
    }

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
