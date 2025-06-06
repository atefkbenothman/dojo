import { MCPClient } from "./mcp-client.js"
import { totalConnections, MAX_CONNECTIONS, incrementTotalConnections, decrementTotalConnections } from "./session.js"
import type { ActiveMcpClient, UserSession } from "./types.js"
import type { MCPServer } from "@dojo/db/convex/types.js"

/**
 * Establishes an MCP connection for a given user session and server config.
 * Handles connection limits, client creation/start, session storage, and connection counting.
 */
export async function establishMcpConnection(
  userSession: UserSession,
  server: MCPServer,
): Promise<{ success: boolean; client?: ActiveMcpClient; error?: string }> {
  if (totalConnections >= MAX_CONNECTIONS) {
    return { success: false, error: "Service busy, connection limit reached" }
  }

  let mcpClient: MCPClient
  try {
    mcpClient = new MCPClient(server)
  } catch (mcpClientError) {
    const errorMessage = `Failed to instantiate MCPClient for user ${userSession.userId}, server ${server._id}`
    console.error(`[Connection] ${errorMessage}:`, mcpClientError)
    return { success: false, error: errorMessage }
  }

  console.log(`[Connection] Starting MCPClient connection for user ${userSession.userId}, server ${server._id}...`)

  try {
    await mcpClient.start()
  } catch (err) {
    const errMessage = `Failed to start MCPClient for user ${userSession.userId}, server ${server._id}`
    console.error(`[Connection] ${errMessage}:`, err)
    return { success: false, error: errMessage }
  }

  const activeMcpClient: ActiveMcpClient = { client: mcpClient, server: server }

  userSession.activeMcpClients.set(server._id, activeMcpClient)
  incrementTotalConnections()

  console.log(
    `[Connection] Connection established for user ${userSession.userId}, server ${server._id}. Total connections: ${totalConnections}`,
  )

  return { success: true, client: activeMcpClient }
}

/**
 * Cleans up a specific MCP connection for a given user session and server ID.
 * Handles client cleanup, session map removal, and connection count decrementing.
 */
export const cleanupExistingConnection = async (userSession: UserSession, mcpServerId: string): Promise<void> => {
  if (!userSession) return

  const existingClient = userSession.activeMcpClients.get(mcpServerId)

  if (existingClient) {
    console.log(`[Connection] Cleaning up connection for user ${userSession.userId}, server ${mcpServerId}...`)
    try {
      await existingClient.client.cleanup()
    } catch (cleanupError) {
      console.error(
        `[Connection]: Error cleaning up client ${mcpServerId} for user ${userSession.userId}:`,
        cleanupError,
      )
    }
    userSession.activeMcpClients.delete(mcpServerId)
    decrementTotalConnections()
    console.log(
      `[Connection]: Cleaned up and decremented connection count for user ${userSession.userId}, server ${mcpServerId}. Total connections now: ${totalConnections}`,
    )
  }
}

/**
 * Aggregates all tools from a user's active MCP clients into a single object.
 */
export function aggregateMcpTools(userSession: UserSession): Record<string, any> {
  const combinedTools: Record<string, any> = {}
  if (userSession.activeMcpClients) {
    for (const mcpClient of userSession.activeMcpClients.values()) {
      const clientTools = mcpClient.client.tools || {}
      Object.assign(combinedTools, clientTools)
    }
  }
  return combinedTools
}
