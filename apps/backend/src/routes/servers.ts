import { AVAILABLE_MCP_SERVERS } from "@/config"
import { Router, Request, Response } from "express"

const router = Router()

router.get("/servers", (req: Request, res: Response) => {
  res.status(200).json({ servers: AVAILABLE_MCP_SERVERS })
})

export default router
