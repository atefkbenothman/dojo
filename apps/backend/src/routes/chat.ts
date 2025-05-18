import { streamAiResponse } from "@/ai-stream"
import { DEFAULT_MODEL_ID, AVAILABLE_AI_MODELS } from "@/config"
import { userContextMiddleware } from "@/middleware/user-context"
import type { RequestWithUserContext } from "@/types"
import { type CoreMessage, type ToolSet } from "ai"
import { Router, Request, Response } from "express"

const router = Router()

/* Chat */
router.post("/chat", userContextMiddleware, async (expressReq: Request, res: Response): Promise<void> => {
  const req = expressReq as RequestWithUserContext

  const { userSession, body } = req

  const { messages, modelId } = body

  const model = modelId || DEFAULT_MODEL_ID

  const validation = validateChatRequest(messages, model)
  if (!validation.isValid) {
    res.status(validation.error?.includes("configured") ? 500 : 400).json({ message: validation.error })
    return
  }

  console.log(`[Core /chat] request received for userId: ${userSession.userId}, using model: ${model}`)

  const aiModel = AVAILABLE_AI_MODELS[model]!.languageModel

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

export default router

export const validateChatRequest = (messages: CoreMessage[], modelId: string): { isValid: boolean; error?: string } => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: "Missing or invalid messages array" }
  }

  const model = modelId || DEFAULT_MODEL_ID
  const aiModel = AVAILABLE_AI_MODELS[model]?.languageModel

  if (!aiModel) {
    return { isValid: false, error: "AI Model not configured on backend" }
  }

  return { isValid: true }
}
