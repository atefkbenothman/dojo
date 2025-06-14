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
    let agentAddedToSession = false
    const session = req.session
    const parsedInput = req.parsedInput as z.infer<typeof agentInputSchema>
    const { agent: agentInfo } = parsedInput

    try {
      const aiModel = req.aiModel as LanguageModel
      const { messages } = parsedInput

      const agent = await convex.query(api.agents.get, { id: agentInfo.agentId as Id<"agents"> })

      if (!agent) {
        res.status(404).json({ error: `Agent with id ${agentInfo.agentId} not found.` })
        return
      }

      const userIdForLogging = session?.userId || "anonymous"
      const combinedTools = session ? aggregateMcpTools(session._id) : {}

      console.log(
        `[REST /agent/run] request received for userId: ${userIdForLogging}, using model: ${agentInfo.modelId}`,
      )

      // Add agent to running agents in session
      if (session) {
        try {
          await convex.mutation(api.sessions.addRunningAgent, {
            sessionId: session._id,
            agentId: agent._id,
          })
          agentAddedToSession = true
          console.log(`[REST /agent/run] Added agent ${agent._id} to running agents for session ${session._id}`)
        } catch (error) {
          console.error(`[REST /agent/run] Failed to add agent to session:`, error)
          // Continue anyway - this is not critical for agent execution
        }
      }

      switch (agent.outputType) {
        case "text":
          console.log(
            `[REST /agent/run]: Using ${Object.keys(combinedTools).length} total tools for userId: ${userIdForLogging}`,
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

      console.log(`[REST /agent/run] Agent ${agent._id} execution completed successfully`)
    } catch (error) {
      console.error("[REST /agent/run] Unhandled error:", error)
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" })
      }
    } finally {
      // Always remove agent from running agents when done (success or error)
      if (session && agentAddedToSession) {
        try {
          await convex.mutation(api.sessions.removeRunningAgent, {
            sessionId: session._id,
            agentId: agentInfo.agentId as Id<"agents">,
          })
          console.log(
            `[REST /agent/run] Removed agent ${agentInfo.agentId} from running agents for session ${session._id}`,
          )
        } catch (error) {
          console.error(`[REST /agent/run] Failed to remove agent from session:`, error)
        }
      }
    }
  },
)
