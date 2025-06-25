import { BACKEND_INSTANCE_ID } from "../../index"
import { convex } from "../../lib/convex-client"
import { logger } from "../../lib/logger"
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
    options?: {
      workflowExecutionId?: Id<"workflowExecutions">
      connectionType?: "user" | "workflow"
    },
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
        workflowExecutionId: options?.workflowExecutionId,
        connectionType: options?.connectionType || "user",
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
            workflowExecutionId: options?.workflowExecutionId,
            connectionType: options?.connectionType || "user",
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
            workflowExecutionId: options?.workflowExecutionId,
            connectionType: options?.connectionType || "user",
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
          workflowExecutionId: options?.workflowExecutionId,
          connectionType: options?.connectionType || "user",
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
          connectionType: "user", // Default for cleanup calls
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
          connectionType: "user", // Default for cleanup calls
        })
        .catch((err) => logger.error("Connection", "Failed to update connection status to disconnected", err))

      logger.info("Connection", `Cleaned up connection for session ${sessionId}, server ${mcpServerId}`)
    }
  }

  /**
   * Checks if a connection already exists for a session and server.
   */
  hasConnection(sessionId: Id<"sessions">, mcpServerId: Id<"mcp">): boolean {
    const sessionConnections = this.connectionCache.get(sessionId)
    return sessionConnections?.has(mcpServerId) ?? false
  }

  /**
   * Gets an existing connection for a session and server.
   */
  getConnection(sessionId: Id<"sessions">, mcpServerId: Id<"mcp">): ActiveMcpClient | null {
    const sessionConnections = this.connectionCache.get(sessionId)
    return sessionConnections?.get(mcpServerId) ?? null
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
   * Cleans up multiple specific MCP connections for a given session.
   * Used to disconnect workflow-specific connections after execution.
   */
  async cleanupConnections(sessionId: Id<"sessions">, mcpServerIds: Id<"mcp">[]): Promise<void> {
    if (mcpServerIds.length === 0) return

    logger.info("Connection", `Cleaning up ${mcpServerIds.length} connections for session ${sessionId}...`)

    const cleanupPromises = mcpServerIds.map(async (serverId) => {
      try {
        await this.cleanupConnection(sessionId, serverId)
      } catch (error) {
        logger.error("Connection", `Error cleaning up connection ${serverId} for session ${sessionId}`, error)
        // Continue with other connections even if one fails
      }
    })

    await Promise.allSettled(cleanupPromises)
    logger.info("Connection", `Completed cleanup of ${mcpServerIds.length} connections for session ${sessionId}`)
  }

  /**
   * Gets the list of currently connected MCP server IDs for a session.
   * Used to track which connections were established before workflow execution.
   */
  getConnectedServerIds(sessionId: Id<"sessions">): Id<"mcp">[] {
    const sessionConnections = this.connectionCache.get(sessionId)
    if (!sessionConnections) return []

    return Array.from(sessionConnections.keys())
  }

  /**
   * Cleans up all MCP connections for a specific workflow execution.
   * Used to auto-disconnect workflow-managed connections after execution.
   */
  async cleanupWorkflowConnections(workflowExecutionId: Id<"workflowExecutions">): Promise<void> {
    try {
      logger.info("Connection", `Cleaning up workflow connections for execution ${workflowExecutionId}...`)

      // Get all workflow connections for this execution from the database
      const workflowConnections = await convex.query(api.mcpConnections.getByWorkflowExecution, {
        workflowExecutionId,
      })

      logger.info(
        "Connection",
        `Found ${workflowConnections.length} connections to cleanup for execution ${workflowExecutionId}`,
      )

      // Clean up each connection
      const cleanupPromises = workflowConnections.map(async (connection) => {
        try {
          await this.cleanupConnection(connection.sessionId, connection.mcpServerId)
        } catch (error) {
          logger.error(
            "Connection",
            `Error cleaning up connection ${connection.mcpServerId} for session ${connection.sessionId}`,
            error,
          )
        }
      })

      await Promise.allSettled(cleanupPromises)
      logger.info("Connection", `Completed cleanup for workflow execution ${workflowExecutionId}`)
    } catch (error) {
      logger.error("Connection", `Error cleaning up workflow connections for execution ${workflowExecutionId}`, error)
      // Don't throw - cleanup errors shouldn't fail the workflow
    }
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
