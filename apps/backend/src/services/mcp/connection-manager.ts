import { BACKEND_INSTANCE_ID } from "../../index"
import { logger } from "../../lib/logger"
import { convex } from "../../lib/convex-client"
import type { ActiveMcpClient } from "../../lib/types"
import { MCPClient } from "./client"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import type { MCPServer } from "@dojo/db/convex/types"
import type { ToolSet } from "ai"

/**
 * Manages MCP client connections and caching
 */
export class MCPConnectionManager {
  private connectionCache = new Map<Id<"sessions">, Map<Id<"mcp">, ActiveMcpClient>>()

  /**
   * Establishes an MCP connection for a given session and server config.
   * Handles client creation/start, and caching the live connection.
   */
  async establishConnection(
    sessionId: Id<"sessions">,
    server: MCPServer,
    userId?: Id<"users">,
  ): Promise<{ success: boolean; client?: ActiveMcpClient; error?: string }> {
    // Create/update connection record in Convex (status: connecting)
    let connectionId: Id<"mcpConnections"> | null = null
    try {
      connectionId = await convex.mutation(api.mcpConnections.upsert, {
        mcpServerId: server._id,
        sessionId,
        userId,
        backendInstanceId: BACKEND_INSTANCE_ID,
        status: "connecting",
      })
    } catch (convexError) {
      logger.error("Connection", "Failed to create connection record in Convex", convexError)
      // Continue anyway - connection tracking is not critical
    }

    let mcpClient: MCPClient
    try {
      mcpClient = new MCPClient(server, sessionId)
    } catch (mcpClientError) {
      const errorMessage = `Failed to instantiate MCPClient for session ${sessionId}, server ${server._id}`
      logger.error("Connection", errorMessage, mcpClientError)

      // Update connection status to error
      if (connectionId) {
        await convex
          .mutation(api.mcpConnections.upsert, {
            mcpServerId: server._id,
            sessionId,
            userId,
            backendInstanceId: BACKEND_INSTANCE_ID,
            status: "error",
            error: errorMessage,
          })
          .catch((err) => logger.error("Connection", "Failed to update connection status to error", err))
      }

      return { success: false, error: errorMessage }
    }

    logger.info("Connection", `Starting MCPClient connection for session ${sessionId}, server ${server._id}...`)

    try {
      await mcpClient.start()
    } catch (err) {
      const errMessage = `Failed to start MCPClient for session ${sessionId}, server ${server._id}`
      logger.error("Connection", errMessage, err)

      // Update connection status to error
      if (connectionId) {
        await convex
          .mutation(api.mcpConnections.upsert, {
            mcpServerId: server._id,
            sessionId,
            userId,
            backendInstanceId: BACKEND_INSTANCE_ID,
            status: "error",
            error: errMessage,
          })
          .catch((err) => logger.error("Connection", "Failed to update connection status to error", err))
      }

      return { success: false, error: errMessage }
    }

    const activeMcpClient: ActiveMcpClient = { client: mcpClient, server: server }

    // Get or create the inner map for the session
    if (!this.connectionCache.has(sessionId)) {
      this.connectionCache.set(sessionId, new Map())
    }
    const sessionConnections = this.connectionCache.get(sessionId)!
    sessionConnections.set(server._id, activeMcpClient)

    // Update connection status to connected
    if (connectionId) {
      await convex
        .mutation(api.mcpConnections.upsert, {
          mcpServerId: server._id,
          sessionId,
          userId,
          backendInstanceId: BACKEND_INSTANCE_ID,
          status: "connected",
        })
        .catch((err) => logger.error("Connection", "Failed to update connection status to connected", err))
    }

    logger.info("Connection", `Connection established for session ${sessionId}, server ${server._id}`)

    return { success: true, client: activeMcpClient }
  }

  /**
   * Cleans up a specific MCP connection for a given session and server ID.
   * Handles client cleanup, cache removal, and connection count decrementing.
   */
  async cleanupConnection(sessionId: Id<"sessions">, mcpServerId: Id<"mcp">): Promise<void> {
    const sessionConnections = this.connectionCache.get(sessionId)
    if (!sessionConnections) return

    const existingClient = sessionConnections.get(mcpServerId)

    if (existingClient) {
      logger.info("Connection", `Cleaning up connection for session ${sessionId}, server ${mcpServerId}...`)

      // Update connection status to disconnecting
      await convex
        .mutation(api.mcpConnections.upsert, {
          mcpServerId,
          sessionId,
          backendInstanceId: BACKEND_INSTANCE_ID,
          status: "disconnecting",
        })
        .catch((err) => logger.error("Connection", "Failed to update connection status to disconnecting", err))

      try {
        await existingClient.client.cleanup()
      } catch (cleanupError) {
        logger.error("Connection", `Error cleaning up client ${mcpServerId} for session ${sessionId}`, cleanupError)
      }
      sessionConnections.delete(mcpServerId)
      if (sessionConnections.size === 0) {
        this.connectionCache.delete(sessionId)
      }

      // Update connection status to disconnected
      await convex
        .mutation(api.mcpConnections.upsert, {
          mcpServerId,
          sessionId,
          backendInstanceId: BACKEND_INSTANCE_ID,
          status: "disconnected",
        })
        .catch((err) => logger.error("Connection", "Failed to update connection status to disconnected", err))

      logger.info("Connection", `Cleaned up connection for session ${sessionId}, server ${mcpServerId}`)
    }
  }

  /**
   * Aggregates all tools from a session's active MCP clients into a single object.
   */
  aggregateTools(sessionId: Id<"sessions">): ToolSet {
    const combinedTools: ToolSet = {}
    const sessionConnections = this.connectionCache.get(sessionId)
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
  async cleanupAllConnections(): Promise<void> {
    logger.info("Connection", "Starting cleanup of all active connections...")

    const totalSessions = this.connectionCache.size
    let totalConnections = 0

    // Count total connections
    for (const sessionConnections of this.connectionCache.values()) {
      totalConnections += sessionConnections.size
    }

    logger.info("Connection", `Cleaning up ${totalConnections} connections across ${totalSessions} sessions...`)

    // Clean up each connection
    for (const [sessionId, sessionConnections] of this.connectionCache.entries()) {
      for (const [serverId] of sessionConnections.entries()) {
        try {
          await this.cleanupConnection(sessionId, serverId)
        } catch (error) {
          logger.error("Connection", `Error cleaning up connection ${serverId} for session ${sessionId}`, error)
          // Continue with other connections even if one fails
        }
      }
    }

    logger.info("Connection", "All connections cleaned up successfully")
  }
}

// Export singleton instance
export const mcpConnectionManager = new MCPConnectionManager()