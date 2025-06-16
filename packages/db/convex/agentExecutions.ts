import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Create a new agent execution
export const create = mutation({
  args: {
    agentId: v.id("agents"),
    sessionId: v.id("sessions"),
    userId: v.optional(v.id("users")),
    aiModelId: v.id("models"),
    mcpServerIds: v.array(v.id("mcp")),
  },
  handler: async (ctx, args) => {
    const executionId = await ctx.db.insert("agentExecutions", {
      agentId: args.agentId,
      sessionId: args.sessionId,
      userId: args.userId,
      aiModelId: args.aiModelId,
      mcpServerIds: args.mcpServerIds,
      status: "preparing",
      startedAt: Date.now(),
      completedAt: undefined,
      error: undefined,
    })

    return executionId
  },
})

// Update execution status
export const updateStatus = mutation({
  args: {
    executionId: v.id("agentExecutions"),
    status: v.union(
      v.literal("preparing"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    if (!execution) throw new Error("Execution not found")

    const updates: any = {
      status: args.status,
    }

    if (args.error) {
      updates.error = args.error
    }

    if (args.status === "completed" || args.status === "failed" || args.status === "cancelled") {
      updates.completedAt = Date.now()
    }

    await ctx.db.patch(args.executionId, updates)
  },
})

// Query executions by session
export const getBySession = query({
  args: {
    sessionId: v.id("sessions"),
    status: v.optional(
      v.union(
        v.literal("preparing"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("agentExecutions").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    return await query.collect()
  },
})

// Get active execution for an agent
export const getActiveExecution = query({
  args: {
    agentId: v.id("agents"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("agentExecutions")
      .withIndex("by_session_status", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) =>
        q.and(
          q.eq(q.field("agentId"), args.agentId),
          q.or(q.eq(q.field("status"), "preparing"), q.eq(q.field("status"), "running")),
        ),
      )
      .first()

    return execution
  },
})

// Get all active executions for a session
export const getActiveExecutions = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query("agentExecutions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.or(q.eq(q.field("status"), "preparing"), q.eq(q.field("status"), "running")))
      .collect()

    return executions
  },
})
