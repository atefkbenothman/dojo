import { totalConnections } from "../core.js"
import { establishMcpConnection, cleanupExistingConnection } from "../mcp-connection.js"
import { userContextMiddleware } from "../middleware/user-context.js"
import type { RequestWithUserContext } from "../types.js"
import { MCPServer } from "@dojo/config"
import { Router, Request, Response } from "express"

const router = Router()

export const validateConnectConfigBody = (server: Partial<MCPServer>): boolean => {
  if (!server || typeof server !== "object") return false
  if (!server.id || typeof server.id !== "string") return false
  if (!server.config || typeof server.config !== "object") return false
  return true
}

/* Connect */
router.post("/connect", userContextMiddleware, async (expressReq: Request, res: Response): Promise<void> => {
  const req = expressReq as RequestWithUserContext

  const userSession: RequestWithUserContext["userSession"] = req.userSession
  const { server } = req.body as { server?: Partial<MCPServer> }
  if (!server) {
    res.status(400).json({ message: "Missing or invalid server object" })
    return
  }
  if (!validateConnectConfigBody(server)) {
    res.status(400).json({ message: "Missing or invalid server object" })
    return
  }

  console.log(`[Connection] /connect request received for userId: ${userSession.userId}, mcpServer: ${server.id}`)

  await cleanupExistingConnection(userSession, server.id!)

  const result = await establishMcpConnection(userSession, server as MCPServer)

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

  const userSession: RequestWithUserContext["userSession"] = req.userSession
  const { serverId } = req.body as { serverId?: string }
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
