import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Create a new agent execution
export const create = mutation({
  args: {
    agentId: v.id("agents"),
    sessionId: v.id("sessions"),
    aiModelId: v.id("models"),
    mcpServerIds: v.array(v.id("mcp")),
  },
  handler: async (ctx, args) => {
    // Get userId from session
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

    const executionId = await ctx.db.insert("agentExecutions", {
      agentId: args.agentId,
      sessionId: args.sessionId,
      userId: session.userId || undefined,
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
      v.literal("connecting"),
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

// Request cancellation of an agent execution
export const requestCancellation = mutation({
  args: {
    executionId: v.id("agentExecutions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    if (!execution) throw new Error("Execution not found")

    // Only allow cancellation if the execution is still running
    if (execution.status !== "preparing" && execution.status !== "connecting" && execution.status !== "running") {
      throw new Error(`Cannot cancel execution with status: ${execution.status}`)
    }

    // Mark cancellation as requested
    await ctx.db.patch(args.executionId, {
      cancellationRequested: true,
    })
  },
})

// Query executions by session
export const getBySession = query({
  args: {
    sessionId: v.id("sessions"),
    status: v.optional(
      v.union(
        v.literal("preparing"),
        v.literal("connecting"),
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
          q.or(
            q.eq(q.field("status"), "preparing"),
            q.eq(q.field("status"), "connecting"),
            q.eq(q.field("status"), "running"),
          ),
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
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "preparing"),
          q.eq(q.field("status"), "connecting"),
          q.eq(q.field("status"), "running"),
        ),
      )
      .collect()

    return executions
  },
})

// Get a single execution by ID
export const get = query({
  args: {
    executionId: v.id("agentExecutions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.executionId)
  },
})
