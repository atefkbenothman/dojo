import { getModelInstance } from "../ai/get-model.js"
import { streamAiResponse } from "../ai/stream-response.js"
import { userContextMiddleware } from "../middleware/user-context.js"
import type { RequestWithUserContext } from "../types.js"
import { AI_MODELS } from "@dojo/config"
import { type CoreMessage, type ToolSet, type LanguageModel } from "ai"
import { Router, Request, Response } from "express"

const router = Router()

/* Chat */
router.post("/chat", userContextMiddleware, async (expressReq: Request, res: Response): Promise<void> => {
  const req = expressReq as RequestWithUserContext

  const userSession: RequestWithUserContext["userSession"] = req.userSession
  const { messages, modelId, apiKey } = req.body as { messages?: CoreMessage[]; modelId?: string; apiKey?: string }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ message: "Missing or invalid messages array" })
    return
  }

  if (!modelId) {
    res.status(400).json({ message: "Missing modelId" })
    return
  }

  let apiKeyFallback = apiKey

  if (!apiKey && AI_MODELS[modelId]?.requiresApiKey === false) {
    apiKeyFallback = process.env.GROQ_API_KEY_FALLBACK
  }

  if (!apiKeyFallback) {
    res.status(400).json({ message: "Missing API key" })
    return
  }

  const validation = validateChatRequest(messages, modelId, apiKeyFallback)
  if (!validation.isValid) {
    res.status(validation.error?.includes("configured") ? 500 : 400).json({ message: validation.error })
    return
  }

  console.log(`[Core /chat] request received for userId: ${userSession.userId}, using model: ${modelId}`)

  let aiModel: LanguageModel
  try {
    aiModel = getModelInstance(modelId, apiKeyFallback) as LanguageModel
  } catch {
    res.status(400).json({ message: `AI Model '${modelId}' not configured on backend` })
    return
  }

  const combinedTools: ToolSet = {}

  if (userSession && userSession.activeMcpClients) {
    for (const mcpClient of userSession.activeMcpClients.values()) {
      const clientTools = mcpClient.client.tools || {}
      Object.assign(combinedTools, clientTools)
    }
  }

  console.log(`[Core /chat]: Using ${Object.keys(combinedTools).length} total tools for userId: ${userSession.userId}`)

  await streamAiResponse({
    res,
    languageModel: aiModel,
    messages: messages,
    tools: combinedTools,
    maxSteps: 10,
  })
})

export const validateChatRequest = (
  messages: CoreMessage[],
  modelId: string,
  apiKey: string,
): { isValid: boolean; error?: string } => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: "Missing or invalid messages array" }
  }
  if (!apiKey || typeof apiKey !== "string") {
    return { isValid: false, error: "Missing or invalid API key" }
  }
  try {
    getModelInstance(modelId, apiKey)
  } catch (err) {
    return { isValid: false, error: (err as Error).message }
  }
  return { isValid: true }
}

export default router
