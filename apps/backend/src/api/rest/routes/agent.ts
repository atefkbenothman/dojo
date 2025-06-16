import { agentService } from "../../../services/agent/agent"
import { createAiRequestMiddleware } from "../middleware"
import type { LanguageModel } from "ai"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const agentRouter: Router = express.Router()

const agentInputSchema = z.object({
  messages: z.array(z.any()).min(1, { message: "Missing or invalid messages array" }),
  agent: z.object({
    modelId: z.string(),
    agentId: z.string(),
  }),
})

agentRouter.post(
  "/run",
  createAiRequestMiddleware(agentInputSchema),
  async (req: Request, res: Response): Promise<void> => {
    const session = req.session
    const parsedInput = req.parsedInput as z.infer<typeof agentInputSchema>
    const { agent: agentInfo, messages } = parsedInput
    const aiModel = req.aiModel as LanguageModel

    console.log(
      `[REST /agent/run] request received for userId: ${session?.userId || "anonymous"}, using model: ${agentInfo.modelId}`,
    )

    const result = await agentService.runAgent({
      agentId: agentInfo.agentId,
      messages,
      session,
      aiModel,
      res,
      modelId: agentInfo.modelId as any,
    })

    if (!result.success) {
      if (!res.headersSent) {
        const statusCode = result.error?.includes("not found") ? 404 : 500
        res.status(statusCode).json({ error: result.error || "Internal server error" })
      }
    }
  },
)
