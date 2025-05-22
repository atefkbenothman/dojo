import { CONFIGURED_MCP_SERVERS, AI_MODELS, CONFIGURED_AGENTS } from "@dojo/config"
import { Router, Request, Response } from "express"

const router = Router()

router.get("/config", (req: Request, res: Response) => {
  res.status(200).json({ aiModels: AI_MODELS, mcpServers: CONFIGURED_MCP_SERVERS, agents: CONFIGURED_AGENTS })
})

export default router
