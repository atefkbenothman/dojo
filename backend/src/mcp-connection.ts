import { MCPClient } from "./mcp-client"
import { asyncTryCatch } from "./utils"
import type { MCPServerConfig, ActiveMcpClient } from "./types"
import {
  getOrCreateUserSession,
  sessions,
  totalConnections,
  MAX_CONNECTIONS,
  incrementTotalConnections,
  decrementTotalConnections,
} from "./core"

/**
 * Establishes an MCP connection for a given session and server config.
 * Handles connection limits, client creation/start, session storage, and connection counting.
 */
export async function establishMcpConnection(
  sessionId: string,
  config: MCPServerConfig,
): Promise<{ success: boolean; client?: ActiveMcpClient; error?: string }> {
  if (totalConnections >= MAX_CONNECTIONS) {
    return { success: false, error: "Service busy, connection limit reached" }
  }

  const userSession = getOrCreateUserSession(sessionId)

  let mcpClient: MCPClient
  try {
    mcpClient = new MCPClient(config)
  } catch (mcpClientError) {
    const errorMessage = `Failed to instantiate MCPClient for ${sessionId}, server ${config.id}`
    console.error(`[Connection] ${errorMessage}:`, mcpClientError)
    return { success: false, error: errorMessage }
  }

  console.log(`[Connection] Starting MCPClient connection for ${sessionId}, server ${config.id}...`)
  const { error: mcpStartError } = await asyncTryCatch(mcpClient.start())

  if (mcpStartError) {
    const errorMessage = `Failed to start MCPClient for ${sessionId}, server ${config.id}`
    console.error(`[Connection] ${errorMessage}:`, mcpStartError)
    await asyncTryCatch(mcpClient.cleanup()) // Attempt cleanup on start failure
    return { success: false, error: errorMessage }
  }

  const activeMcpClient: ActiveMcpClient = { client: mcpClient, config }

  userSession.activeMcpClients.set(config.id, activeMcpClient)
  incrementTotalConnections()

  console.log(
    `[Connection] Connection established for ${sessionId}, server ${config.id}. Total connections: ${totalConnections}`,
  )

  return { success: true, client: activeMcpClient }
}

/**
 * Cleans up a specific MCP connection for a given session and server ID.
 * Handles client cleanup, session map removal, and connection count decrementing.
 */
export const cleanupExistingConnection = async (sessionId: string, mcpServerId: string): Promise<void> => {
  const userSession = sessions.get(sessionId)
  if (!userSession) return

  const existingClient = userSession.activeMcpClients.get(mcpServerId)
  if (existingClient) {
    console.log(`[Connection] Cleaning up connection for session ${sessionId}, server ${mcpServerId}...`)
    const { error } = await asyncTryCatch(existingClient.client.cleanup())
    if (error) {
      console.error(`[Connection]: Error cleaning up client ${mcpServerId} for session ${sessionId}:`, error)
    }
    userSession.activeMcpClients.delete(mcpServerId)
    decrementTotalConnections()
    console.log(
      `[Connection]: Cleaned up and decremented connection count for ${sessionId}, server ${mcpServerId}. Total connections now: ${totalConnections}`,
    )
  }
}
