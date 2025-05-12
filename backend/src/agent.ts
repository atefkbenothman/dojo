import { Router, Request, Response } from "express"

const agentRouter = Router()

/* Run agent */
agentRouter.post("/run", (req: Request, res: Response) => {
  const { sessionId, config } = req.body

  if (!config || typeof config !== "object" || !config.id || typeof config.id !== "string") {
    res.status(400).json({ message: "Missing or invalid config" })
    return
  }

  console.log(`[agentRouter] Placeholder run for agent '${config.id}' in session '${sessionId}'`)

  res.status(200).json({ success: true, message: `Agent '${config.id}' run for session '${sessionId}'` })
  return
})

export default agentRouter
