import { getModelInstance } from "../ai/get-model.js"
import { streamObjectResponse } from "../ai/stream-object-response.js"
import { streamTextResponse } from "../ai/stream-text-response.js"
import { getOrCreateUserSession } from "../core.js"
import { AgentConfigSchema, AI_MODELS, CoreMessageSchema } from "@dojo/config"
import { tryCatch } from "@dojo/utils"
import type { LanguageModel, ToolSet, CoreMessage } from "ai"
import "dotenv/config"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const agentRouter: Router = express.Router()

const agentInputSchema = z.object({
  messages: z.array(CoreMessageSchema).min(1, { message: "Missing or invalid messages array" }),
  apiKey: z.string().optional(),
  modelId: z.string(),
  config: AgentConfigSchema,
})

agentRouter.post("/run", async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = agentInputSchema.safeParse(req.body)
    if (!validationResult.success) {
      res.status(400).json({ error: "Invalid input", details: validationResult.error.formErrors })
      return
    }

    const { messages, modelId, apiKey: providedApiKey, config } = validationResult.data

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

    let apiKeyToUse = providedApiKey
    if (!apiKeyToUse && AI_MODELS[modelId]?.requiresApiKey === false) {
      apiKeyToUse = process.env.GROQ_API_KEY_FALLBACK || ""
    }

    if (!apiKeyToUse) {
      res.status(400).json({ error: "Missing API key." })
      return
    }

    const { data: modelInstance, error: modelError } = tryCatch(getModelInstance(modelId, apiKeyToUse))
    if (modelError || !modelInstance) {
      res.status(400).json({
        error: `Failed to initialize AI model '${modelId}'. Please check your API key and try again.`,
      })
      return
    }

    const aiModel = modelInstance as LanguageModel

    console.log(`[REST /agent/run] request received for userId: ${userSession.userId}, using model: ${modelId}`)

    switch (config.output.type) {
      case "text":
        const combinedTools: ToolSet = {}
        if (userSession.activeMcpClients) {
          for (const mcpClient of userSession.activeMcpClients.values()) {
            const clientTools = mcpClient.client.tools || {}
            Object.assign(combinedTools, clientTools)
          }
        }
        console.log(
          `[REST /agent/run]: Using ${Object.keys(combinedTools).length} total tools for userId: ${userSession.userId}`,
        )
        await streamTextResponse({
          res,
          languageModel: aiModel,
          messages: messages as CoreMessage[],
          tools: combinedTools,
        })
        break
      case "object":
        await streamObjectResponse({
          res,
          languageModel: aiModel,
          messages: messages as CoreMessage[],
        })
        break
      default:
        console.error("[REST /agent/run] Unknown or unhandled output type encountered.")
        res.status(500).json({ error: "Internal server error: Unknown or unhandled output type" })
        return
    }
  } catch (error) {
    console.error("[REST /agent/run] Unhandled error:", error)
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" })
    }
  }
})
