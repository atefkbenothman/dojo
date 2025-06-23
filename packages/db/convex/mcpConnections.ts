import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Create or update a connection
export const upsert = mutation({
  args: {
    mcpServerId: v.id("mcp"),
    sessionId: v.id("sessions"),
    userId: v.optional(v.id("users")),
    backendInstanceId: v.string(),
    status: v.union(
      v.literal("connecting"),
      v.literal("connected"),
      v.literal("disconnecting"),
      v.literal("disconnected"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
    workflowExecutionId: v.optional(v.id("workflowExecutions")),
    connectionType: v.union(v.literal("user"), v.literal("workflow")),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists
    const existing = await ctx.db
      .query("mcpConnections")
      .withIndex("by_session_mcp", (q) => q.eq("sessionId", args.sessionId).eq("mcpServerId", args.mcpServerId))
      .first()

    const now = Date.now()

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        status: args.status,
        error: args.error,
        backendInstanceId: args.backendInstanceId,
        lastHeartbeat: now,
        workflowExecutionId: args.workflowExecutionId,
        connectionType: args.connectionType,
        ...(args.status === "disconnected" ? { disconnectedAt: now } : {}),
      })
      return existing._id
    } else {
      // Create new connection
      const connectionId = await ctx.db.insert("mcpConnections", {
        mcpServerId: args.mcpServerId,
        sessionId: args.sessionId,
        userId: args.userId,
        backendInstanceId: args.backendInstanceId,
        status: args.status,
        error: args.error,
        workflowExecutionId: args.workflowExecutionId,
        connectionType: args.connectionType,
        connectedAt: now,
        lastHeartbeat: now,
        disconnectedAt: undefined,
      })
      return connectionId
    }
  },
})

// Update heartbeat for a connection
export const updateHeartbeat = mutation({
  args: {
    connectionId: v.id("mcpConnections"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      lastHeartbeat: Date.now(),
    })
  },
})

// Bulk update heartbeats for a backend instance
export const updateHeartbeats = mutation({
  args: {
    backendInstanceId: v.string(),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("mcpConnections")
      .withIndex("by_backend", (q) => q.eq("backendInstanceId", args.backendInstanceId))
      .filter((q) => q.eq(q.field("status"), "connected"))
      .collect()

    const now = Date.now()
    await Promise.all(connections.map((conn) => ctx.db.patch(conn._id, { lastHeartbeat: now })))

    return connections.length
  },
})

// Mark connections as disconnected for a backend instance (used on shutdown)
export const disconnectByBackend = mutation({
  args: {
    backendInstanceId: v.string(),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("mcpConnections")
      .withIndex("by_backend", (q) => q.eq("backendInstanceId", args.backendInstanceId))
      .filter((q) => q.or(q.eq(q.field("status"), "connected"), q.eq(q.field("status"), "connecting")))
      .collect()

    const now = Date.now()
    await Promise.all(
      connections.map((conn) =>
        ctx.db.patch(conn._id, {
          status: "disconnected",
          disconnectedAt: now,
          error: "Backend instance shutdown",
        }),
      ),
    )

    return connections.length
  },
})

// Get active connections for a session
export const getBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("mcpConnections")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect()

    // Filter out stale connections (no heartbeat in last 90 seconds)
    const now = Date.now()
    const STALE_THRESHOLD = 90 * 1000 // 90 seconds

    return connections.map((conn) => ({
      ...conn,
      isStale: conn.status === "connected" && now - conn.lastHeartbeat > STALE_THRESHOLD,
    }))
  },
})

// Get a specific connection
export const getConnection = query({
  args: {
    sessionId: v.id("sessions"),
    mcpServerId: v.id("mcp"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("mcpConnections")
      .withIndex("by_session_mcp", (q) => q.eq("sessionId", args.sessionId).eq("mcpServerId", args.mcpServerId))
      .first()

    if (!connection) return null

    // Check if connection is stale
    const now = Date.now()
    const STALE_THRESHOLD = 90 * 1000 // 90 seconds
    const isStale = connection.status === "connected" && now - connection.lastHeartbeat > STALE_THRESHOLD

    return {
      ...connection,
      isStale,
    }
  },
})

// Get connections by workflow execution ID
export const getByWorkflowExecution = query({
  args: {
    workflowExecutionId: v.id("workflowExecutions"),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("mcpConnections")
      .withIndex("by_workflow_execution", (q) => q.eq("workflowExecutionId", args.workflowExecutionId))
      .collect()

    return connections
  },
})

// Clean up stale connections (for periodic cleanup)
export const cleanupStale = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const STALE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

    const staleConnections = await ctx.db
      .query("mcpConnections")
      .filter((q) => q.and(q.eq(q.field("status"), "connected"), q.lt(q.field("lastHeartbeat"), now - STALE_THRESHOLD)))
      .collect()

    await Promise.all(
      staleConnections.map((conn) =>
        ctx.db.patch(conn._id, {
          status: "disconnected",
          disconnectedAt: now,
          error: "Connection timeout - no heartbeat",
        }),
      ),
    )

    return staleConnections.length
  },
})
