import type { ActiveMcpClient } from "../../lib/types"
import { liveConnectionCache } from "./cache"
import { MCPClient } from "./client"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import type { MCPServer } from "@dojo/db/convex/types"
import type { ToolSet } from "ai"

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
export function aggregateMcpTools(sessionId: Id<"sessions">): ToolSet {
  const combinedTools: ToolSet = {}
  const sessionConnections = liveConnectionCache.get(sessionId)
  if (sessionConnections) {
    for (const mcpClient of sessionConnections.values()) {
      const clientTools = mcpClient.client.tools || {}
      Object.assign(combinedTools, clientTools)
    }
  }
  return combinedTools
}

/**
 * Cleans up all active MCP connections across all sessions.
 * Used during graceful shutdown to ensure no orphaned processes.
 */
export async function cleanupAllConnections(): Promise<void> {
  console.log("[Connection] Starting cleanup of all active connections...")

  const totalSessions = liveConnectionCache.size
  let totalConnections = 0

  // Count total connections
  for (const sessionConnections of liveConnectionCache.values()) {
    totalConnections += sessionConnections.size
  }

  console.log(`[Connection] Cleaning up ${totalConnections} connections across ${totalSessions} sessions...`)

  // Clean up each connection
  for (const [sessionId, sessionConnections] of liveConnectionCache.entries()) {
    for (const [serverId] of sessionConnections.entries()) {
      try {
        await cleanupExistingConnection(sessionId, serverId)
      } catch (error) {
        console.error(`[Connection] Error cleaning up connection ${serverId} for session ${sessionId}:`, error)
        // Continue with other connections even if one fails
      }
    }
  }

  console.log("[Connection] All connections cleaned up successfully")
}
