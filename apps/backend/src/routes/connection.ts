import { totalConnections } from "@/core"
import { establishMcpConnection, cleanupExistingConnection } from "@/mcp-connection"
import { userContextMiddleware } from "@/middleware/user-context"
import type { MCPServerConfig, RequestWithUserContext } from "@/types"
import { Router, Request, Response } from "express"

const router = Router()

export const validateConnectConfigBody = (config: Partial<MCPServerConfig>): boolean => {
  if (!config || typeof config !== "object") return false
  if (!config.id || typeof config.id !== "string") return false
  return true
}

/* Connect */
router.post("/connect", userContextMiddleware, async (expressReq: Request, res: Response): Promise<void> => {
  const req = expressReq as RequestWithUserContext

  const { userSession, body } = req

  const config = body.config as Partial<MCPServerConfig>

  if (!validateConnectConfigBody(config)) {
    res.status(400).json({ message: "Missing or invalid config" })
    return
  }

  console.log(`[Connection] /connect request received for userId: ${userSession.userId}, mcpServer: ${config.id}`)

  await cleanupExistingConnection(userSession, config.id!)

  const result = await establishMcpConnection(userSession, config as MCPServerConfig)

  if (!result.success) {
    const statusCode = result.error?.includes("limit reached") ? 503 : 500
    res.status(statusCode).json({ message: result.error || "Failed to establish connection" })
    return
  }

  const tools = result.client?.client.tools || {}
  res.status(200).json({ tools })
})

/* Disconnect */
router.post("/disconnect", userContextMiddleware, async (expressReq: Request, res: Response): Promise<void> => {
  const req = expressReq as RequestWithUserContext

  const { userSession, body } = req

  const serverId = body.serverId as string

  if (!serverId || typeof serverId !== "string") {
    res.status(400).json({ message: "Missing or invalid serverId" })
    return
  }

  console.log(`[Connection] /disconnect request received for userId: ${userSession.userId}, server: ${serverId}`)

  await cleanupExistingConnection(userSession, serverId)

  console.log(
    `[Connection] Connection closed for userId: ${userSession.userId}, server: ${serverId}. Total connections now: ${totalConnections}`,
  )
  res.status(200).json({ message: "Disconnection successful" })
})

export default router
