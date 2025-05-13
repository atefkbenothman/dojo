import { Router, Request, Response } from "express"
import type { MCPServerConfig } from "../types"
import { totalConnections } from "../core"
import { establishMcpConnection, cleanupExistingConnection } from "../mcp-connection"

const router = Router()

export const validateReqBody = (sessionId: any, config: any): boolean => {
  if (!sessionId || typeof sessionId !== "string") return false
  if (!config || typeof config !== "object") return false
  if (!config.id || typeof config.id !== "string") return false
  return true
}

/* Connect */
router.post("/connect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, config } = req.body

  if (!validateReqBody(sessionId, config)) {
    res.status(400).json({ message: "Missing or invalid sessionId or config" })
    return
  }

  console.log(`[Connection] /connect request received for sessionId: ${sessionId}, mcpServer: ${config.id}`)

  // Explicitly clean up any potentially existing connection before establishing a new one via /connect
  await cleanupExistingConnection(sessionId, config.id)

  const result = await establishMcpConnection(sessionId, config as MCPServerConfig)

  if (!result.success) {
    const statusCode = result.error?.includes("limit reached") ? 503 : 500
    res.status(statusCode).json({ message: result.error || "Failed to establish connection" })
    return
  }

  const tools = result.client?.client.tools || {}
  res.status(200).json({ tools })
})

/* Disconnect */
router.post("/disconnect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, serverId } = req.body

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ message: "Missing or invalid sessionId" })
    return
  }

  if (!serverId || typeof serverId !== "string") {
    res.status(400).json({ message: "Missing or invalid serverId" })
    return
  }

  console.log(`[Connection] /disconnect request received for sessionId: ${sessionId}, server: ${serverId}`)

  await cleanupExistingConnection(sessionId, serverId)

  console.log(
    `[Connection] Connection closed for ${sessionId}, server: ${serverId}. Total connections now: ${totalConnections}`,
  )
  res.status(200).json({ message: "Disconnection successful" })
})

export default router
