import { getConvexUser } from "../../../lib/auth"
import { convex } from "../../../lib/convex-client"
import { workflowService } from "../../../services/workflow/workflow"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import type { CoreMessage } from "ai"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const workflowRouter: Router = express.Router()

const workflowInputSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.string(),
          content: z.unknown(),
        })
        .passthrough(),
    )
    .min(1, { message: "Missing or invalid messages array" }),
  workflow: z.object({
    workflowId: z.string(),
  }),
})

workflowRouter.post("/run", async (req: Request, res: Response): Promise<void> => {
  // Parse and validate input
  const validationResult = workflowInputSchema.safeParse(req.body)

  if (!validationResult.success) {
    res.status(400).json({ error: "Invalid input", details: validationResult.error.formErrors })
    return
  }

  const parsedInput = validationResult.data
  const { messages, workflow: workflowInfo } = parsedInput

  // Get session (similar to middleware logic)
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
    `[REST /workflow/run] request received for userId: ${session?.userId || "anonymous"}, workflow: ${workflowInfo.workflowId}`,
  )

  const result = await workflowService.runWorkflow({
    workflowId: workflowInfo.workflowId,
    messages: messages as CoreMessage[],
    session,
    res,
  })

  if (!result.success) {
    if (!res.headersSent) {
      const statusCode = result.error?.includes("not found")
        ? 404
        : result.error?.includes("no valid steps")
          ? 400
          : 500
      res.status(statusCode).json({ error: result.error || "Internal server error" })
    } else if (!res.writableEnded) {
      res.end()
    }
  }
  // Note: The WorkflowExecutor handles streaming responses and ending the response
  // So we don't need to do anything here for successful executions
})
