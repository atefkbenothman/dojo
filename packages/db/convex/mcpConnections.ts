import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Create or update a connection
export const upsert = mutation({
  args: {
    mcpServerId: v.id("mcp"),
    sessionId: v.id("sessions"),
    backendInstanceId: v.string(),
    status: v.union(
      v.literal("connecting"),
      v.literal("connected"),
      v.literal("disconnecting"),
      v.literal("disconnected"),
      v.literal("error"),
    ),
    statusUpdatedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    workflowExecutionId: v.optional(v.id("workflowExecutions")),
    agentExecutionId: v.optional(v.id("agentExecutions")),
    connectionType: v.union(v.literal("user"), v.literal("workflow"), v.literal("agent")),
  },
  handler: async (ctx, args) => {
    // Get userId from session
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

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
        statusUpdatedAt: args.statusUpdatedAt || now,
        workflowExecutionId: args.workflowExecutionId,
        agentExecutionId: args.agentExecutionId,
        connectionType: args.connectionType,
        ...(args.status === "disconnected" ? { disconnectedAt: now } : {}),
      })
      return existing._id
    } else {
      // Create new connection
      const connectionId = await ctx.db.insert("mcpConnections", {
        mcpServerId: args.mcpServerId,
        sessionId: args.sessionId,
        userId: session.userId || undefined,
        backendInstanceId: args.backendInstanceId,
        status: args.status,
        error: args.error,
        connectionType: args.connectionType,
        connectedAt: now,
        statusUpdatedAt: args.statusUpdatedAt || now,
        disconnectedAt: undefined,
        workflowExecutionId: args.workflowExecutionId,
        agentExecutionId: args.agentExecutionId,
      })
      return connectionId
    }
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

    return connections
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

    return connection
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

// Get connections by agent execution ID  
export const getByAgentExecution = query({
  args: {
    agentExecutionId: v.id("agentExecutions"),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("mcpConnections")
      .withIndex("by_agent_execution", (q) => q.eq("agentExecutionId", args.agentExecutionId))
      .collect()

    return connections
  },
})

