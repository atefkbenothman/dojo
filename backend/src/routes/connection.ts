import { Router, Request, Response } from "express"
import { MCPClient } from "../mcp-client"
import { asyncTryCatch, tryCatch } from "../utils"
import type { MCPServerConfig, ActiveMcpClient, UserSession } from "../types"
import {
  sessions,
  getOrCreateUserSession,
  totalConnections,
  MAX_CONNECTIONS,
  incrementTotalConnections,
  decrementTotalConnections,
} from "../core"

const router = Router()

export const validateReqBody = (sessionId: any, config: any): boolean => {
  if (!sessionId || typeof sessionId !== "string") return false
  if (!config || typeof config !== "object") return false
  if (!config.id || typeof config.id !== "string") return false
  return true
}

export const validateServerConnection = (sessionId: string, serverId: string): boolean => {
  const userSession = sessions.get(sessionId)
  if (!userSession) return true
  if (userSession.activeMcpClients.has(serverId)) {
    console.log(`[connectionRouter] Session ${sessionId} already has a connection to server ${serverId}`)
    return false
  }
  return true
}

export const cleanupExistingConnection = async (sessionId: string, mcpServerId: string): Promise<void> => {
  const userSession = sessions.get(sessionId)
  if (!userSession) return

  const existingClient = userSession.activeMcpClients.get(mcpServerId)
  if (existingClient) {
    const { error } = await asyncTryCatch(existingClient.client.cleanup())
    if (error) {
      console.error(
        `[connectionRouter /cleanup]: Error cleaning up client for session ${sessionId}, server ${mcpServerId}:`,
        error,
      )
    }
    userSession.activeMcpClients.delete(mcpServerId)
    const currentTotal = totalConnections
    console.log(
      `[connectionRouter /cleanup]: Cleaned up connection for ${sessionId}, server ${mcpServerId}. Total connections before cleanup: ${currentTotal}`,
    )
    decrementTotalConnections()
  }
}

/* Connect */
router.post("/connect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, config } = req.body

  if (!validateReqBody(sessionId, config)) {
    res.status(400).json({ message: "Missing or invalid sessionId or config" })
    return
  }

  console.log(`[connectionRouter] /connect request received for sessionId: ${sessionId}, mcpServer: ${config.id}`)

  if (!validateServerConnection(sessionId, config.id)) {
    res.status(400).json({ message: `Server ${config.id} is already connected for this session` })
    return
  }

  await cleanupExistingConnection(sessionId, config.id)

  if (totalConnections >= MAX_CONNECTIONS) {
    res.status(503).json({ message: "Service busy, connection limit reached" })
    return
  }

  const userSession = getOrCreateUserSession(sessionId)

  const { data: mcpClient, error: mcpClientError } = tryCatch(new MCPClient(config as MCPServerConfig))

  if (!mcpClient || mcpClientError) {
    console.error(
      `[connectionRouter] Error establishing connection for ${sessionId}, server ${config.id}:`,
      mcpClientError,
    )
    res.status(500).json({ message: "Failed to establish connection" })
    return
  }

  console.log(`[connectionRouter] Starting MCPClient connection for ${sessionId}, server ${config.id}...`)

  const { error: mcpStartError } = await asyncTryCatch(mcpClient.start())

  if (mcpStartError) {
    console.error(`[connectionRouter] Error starting MCPClient for ${sessionId}, server ${config.id}`, mcpStartError)
    await asyncTryCatch(mcpClient.cleanup())
    res.status(500).json({ message: "Failed to start MCPClient" })
    return
  }

  const activeMcpClient: ActiveMcpClient = {
    client: mcpClient,
    config: config as MCPServerConfig,
  }

  userSession.activeMcpClients.set(config.id, activeMcpClient)
  incrementTotalConnections()

  console.log(
    `[connectionRouter] Connection established for ${sessionId}, server ${config.id}. Total connections: ${totalConnections}`,
  )

  const tools = mcpClient.tools

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

  console.log(`[connectionRouter] /disconnect request received for sessionId: ${sessionId}, server: ${serverId}`)

  await cleanupExistingConnection(sessionId, serverId)

  console.log(
    `[connectionRouter] Connection closed for ${sessionId}, server: ${serverId}. Total connections: ${totalConnections}`,
  )
  res.status(200).json({ message: "Disconnection successful" })
})

export default router
