import { totalConnections, MAX_CONNECTIONS, incrementTotalConnections, decrementTotalConnections } from "@/core"
import { MCPClient } from "@/mcp-client"
import type { MCPServerConfig, ActiveMcpClient, UserSession } from "@/types"

/**
 * Establishes an MCP connection for a given user session and server config.
 * Handles connection limits, client creation/start, session storage, and connection counting.
 */
export async function establishMcpConnection(
  userSession: UserSession,
  config: MCPServerConfig,
): Promise<{ success: boolean; client?: ActiveMcpClient; error?: string }> {
  if (totalConnections >= MAX_CONNECTIONS) {
    return { success: false, error: "Service busy, connection limit reached" }
  }

  let mcpClient: MCPClient
  try {
    mcpClient = new MCPClient(config)
  } catch (mcpClientError) {
    const errorMessage = `Failed to instantiate MCPClient for user ${userSession.userId}, server ${config.id}`
    console.error(`[Connection] ${errorMessage}:`, mcpClientError)
    return { success: false, error: errorMessage }
  }

  console.log(`[Connection] Starting MCPClient connection for user ${userSession.userId}, server ${config.id}...`)
  try {
    await mcpClient.start()
  } catch (mcpStartErrorCaught) {
    const errorMessage = `Failed to start MCPClient for user ${userSession.userId}, server ${config.id}`
    console.error(`[Connection] ${errorMessage}:`, mcpStartErrorCaught)
    try {
      await mcpClient.cleanup()
      console.log(
        `[Connection] Cleaned up MCPClient after start failure for user ${userSession.userId}, server ${config.id}.`,
      )
    } catch (cleanupAfterStartError) {
      console.error(
        `[Connection] Error during cleanup after MCPClient start failure for user ${userSession.userId}, server ${config.id}:`,
        cleanupAfterStartError,
      )
    }
    return { success: false, error: errorMessage }
  }

  const activeMcpClient: ActiveMcpClient = { client: mcpClient, config }

  userSession.activeMcpClients.set(config.id, activeMcpClient)
  incrementTotalConnections()

  console.log(
    `[Connection] Connection established for user ${userSession.userId}, server ${config.id}. Total connections: ${totalConnections}`,
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
