import { Router, Request, Response } from "express"
import { type CoreMessage, type ToolSet } from "ai"
import { DEFAULT_MODEL_ID, AVAILABLE_AI_MODELS } from "../config"
import { sessions } from "../core"
import { streamAiResponse } from "../ai"

const router = Router()

/* Chat */
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, messages, modelId } = req.body

  const model = modelId || DEFAULT_MODEL_ID

  const validation = validateChatRequest(messages, model)
  if (!validation.isValid) {
    res.status(validation.error?.includes("configured") ? 500 : 400).json({ message: validation.error })
    return
  }

  console.log(`[Core /chat] request received for sessionId: ${sessionId}, using model: ${model}`)

  const aiModel = AVAILABLE_AI_MODELS[model].languageModel

  const userSession = sessions.get(sessionId)

  const combinedTools: ToolSet = {}

  if (userSession) {
    for (const mcpClient of userSession.activeMcpClients.values()) {
      const clientTools = mcpClient.client.tools || {}
      Object.assign(combinedTools, clientTools)
    }
  }

  console.log(`[Core /chat]: Using ${Object.keys(combinedTools).length} total tools`)

  await streamAiResponse({
    res,
    languageModel: aiModel,
    messages: messages as CoreMessage[],
    tools: combinedTools,
    maxSteps: 10,
  })
})

export default router

export const validateChatRequest = (messages: any, modelId: string): { isValid: boolean; error?: string } => {
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
