import { streamObjectResponse } from "../ai/stream-object-response.js"
import { streamTextResponse } from "../ai/stream-text-response.js"
import { convex } from "../convex-client.js"
import { aggregateMcpTools } from "../mcp-connection.js"
import { createAiRequestMiddleware } from "./middleware.js"
import { api } from "@dojo/db/convex/_generated/api.js"
import { Id } from "@dojo/db/convex/_generated/dataModel.js"
import type { CoreMessage, LanguageModel } from "ai"
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
    try {
      const userSession = req.userSession
      const aiModel = req.aiModel as LanguageModel
      const parsedInput = req.parsedInput as z.infer<typeof agentInputSchema>

      const { messages, agent: agentInfo } = parsedInput

      const agent = await convex.query(api.agents.get, { id: agentInfo.agentId as Id<"agents"> })

      if (!agent) {
        res.status(404).json({ error: `Agent with id ${agentInfo.agentId} not found.` })
        return
      }

      const userId = userSession ? userSession.userId : "anonymous"
      const combinedTools = userSession ? aggregateMcpTools(userSession) : {}

      console.log(`[REST /agent/run] request received for userId: ${userId}, using model: ${agentInfo.modelId}`)

      switch (agent.outputType) {
        case "text":
          console.log(`[REST /agent/run]: Using ${Object.keys(combinedTools).length} total tools for userId: ${userId}`)
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
  },
)
