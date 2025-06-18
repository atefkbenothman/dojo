import { getConvexUser } from "../../../lib/auth"
import { convex } from "../../../lib/convex-client"
import { agentService } from "../../../services/agent/agent"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const agentRouter: Router = express.Router()

const agentInputSchema = z.object({
  messages: z.array(z.any()).min(1, { message: "Missing or invalid messages array" }),
  agent: z.object({
    agentId: z.string(),
  }),
})

agentRouter.post("/run", async (req: Request, res: Response): Promise<void> => {
  const validationResult = agentInputSchema.safeParse(req.body)

  if (!validationResult.success) {
    res.status(400).json({ error: "Invalid input", details: validationResult.error.formErrors })
    return
  }

  const parsedInput = validationResult.data
  const { agent: agentInfo, messages } = parsedInput

  const user = await getConvexUser(req.headers.authorization)

  let session = null
  if (user) {
    session = await convex.query(api.sessions.getByUserId, {
      userId: user._id,
    })
  } else {
    const clientSessionIdHeader = req.headers["x-guest-session-id"]
    const clientSessionId = Array.isArray(clientSessionIdHeader) ? clientSessionIdHeader[0] : clientSessionIdHeader

    if (clientSessionId) {
      session = await convex.query(api.sessions.getByClientSessionId, {
        clientSessionId,
      })
    }
  }

  if (!session) {
    res.status(401).json({ error: "No active session found. Please refresh the page and try again." })
    return
  }

  console.log(
    `[REST /agent/run] request received for userId: ${session?.userId || "anonymous"}, agent: ${agentInfo.agentId}`,
  )

  const result = await agentService.runAgent({
    agentId: agentInfo.agentId,
    messages,
    session,
    res,
  })

  if (!result.success) {
    if (!res.headersSent) {
      const statusCode = result.error?.includes("not found") ? 404 : 500
      res.status(statusCode).json({ error: result.error || "Internal server error" })
    }
  }
})
