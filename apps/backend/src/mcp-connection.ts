import { liveConnectionCache } from "./connection-cache.js"
import { MCPClient } from "./mcp-client.js"
import type { ActiveMcpClient } from "./types.js"
import { Id } from "@dojo/db/convex/_generated/dataModel.js"
import type { MCPServer } from "@dojo/db/convex/types.js"

/**
 * Establishes an MCP connection for a given session and server config.
 * Handles client creation/start, and caching the live connection.
 */
export async function establishMcpConnection(
  sessionId: Id<"sessions">,
  server: MCPServer,
): Promise<{ success: boolean; client?: ActiveMcpClient; error?: string }> {
  let mcpClient: MCPClient
  try {
    mcpClient = new MCPClient(server)
  } catch (mcpClientError) {
    const errorMessage = `Failed to instantiate MCPClient for session ${sessionId}, server ${server._id}`
    console.error(`[Connection] ${errorMessage}:`, mcpClientError)
    return { success: false, error: errorMessage }
  }

  console.log(`[Connection] Starting MCPClient connection for session ${sessionId}, server ${server._id}...`)

  try {
    await mcpClient.start()
  } catch (err) {
    const errMessage = `Failed to start MCPClient for session ${sessionId}, server ${server._id}`
    console.error(`[Connection] ${errMessage}:`, err)
    return { success: false, error: errMessage }
  }

  const activeMcpClient: ActiveMcpClient = { client: mcpClient, server: server }

  // Get or create the inner map for the session
  if (!liveConnectionCache.has(sessionId)) {
    liveConnectionCache.set(sessionId, new Map())
  }
  const sessionConnections = liveConnectionCache.get(sessionId)!
  sessionConnections.set(server._id, activeMcpClient)

  console.log(`[Connection] Connection established for session ${sessionId}, server ${server._id}.`)

  return { success: true, client: activeMcpClient }
}

/**
 * Cleans up a specific MCP connection for a given session and server ID.
 * Handles client cleanup, cache removal, and connection count decrementing.
 */
export const cleanupExistingConnection = async (sessionId: Id<"sessions">, mcpServerId: Id<"mcp">): Promise<void> => {
  const sessionConnections = liveConnectionCache.get(sessionId)
  if (!sessionConnections) return

  const existingClient = sessionConnections.get(mcpServerId)

  if (existingClient) {
    console.log(`[Connection] Cleaning up connection for session ${sessionId}, server ${mcpServerId}...`)
    try {
      await existingClient.client.cleanup()
    } catch (cleanupError) {
      console.error(`[Connection]: Error cleaning up client ${mcpServerId} for session ${sessionId}:`, cleanupError)
    }
    sessionConnections.delete(mcpServerId)
    if (sessionConnections.size === 0) {
      liveConnectionCache.delete(sessionId)
    }
    console.log(`[Connection]: Cleaned up connection for session ${sessionId}, server ${mcpServerId}.`)
  }
}

/**
 * Aggregates all tools from a session's active MCP clients into a single object.
 */
export function aggregateMcpTools(sessionId: Id<"sessions">): Record<string, unknown> {
  const combinedTools: Record<string, unknown> = {}
  const sessionConnections = liveConnectionCache.get(sessionId)
  if (sessionConnections) {
    for (const mcpClient of sessionConnections.values()) {
      const clientTools = mcpClient.client.tools || {}
      Object.assign(combinedTools, clientTools)
    }
  }
  return combinedTools
}
