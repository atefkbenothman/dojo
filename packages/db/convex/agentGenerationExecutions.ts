import { Id } from "./_generated/dataModel"
import { mutation, query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"

// Helper to get current userId from auth context
async function getCurrentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return identity.subject.split("|")[0] as Id<"users">
}

// Create a new agent generation execution
export const create = mutation({
  args: {
    prompt: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get userId from auth context
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to create agent generations")
    }

    const executionId = await ctx.db.insert("agentGenerationExecutions", {
      userId,
      prompt: args.prompt,
      modelId: args.modelId,
      status: "running",
      startedAt: Date.now(),
      completedAt: undefined,
      error: undefined,
      agentId: undefined,
    })

    return executionId
  },
})

// Update execution status
export const updateStatus = mutation({
  args: {
    executionId: v.id("agentGenerationExecutions"),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    if (!execution) throw new Error("Generation execution not found")

    const updates: any = {
      status: args.status,
    }

    if (args.error) {
      updates.error = args.error
    }

    if (args.agentId) {
      updates.agentId = args.agentId
    }

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now()
    }

    await ctx.db.patch(args.executionId, updates)
  },
})

// Query executions by user
export const getByUser = query({
  args: {
    status: v.optional(v.union(v.literal("running"), v.literal("completed"), v.literal("failed"))),
  },
  handler: async (ctx, args) => {
    // Get userId from auth context
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to get agent generations")
    }

    let query = ctx.db.query("agentGenerationExecutions").withIndex("by_user", (q) => q.eq("userId", userId))

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    return await query.collect()
  },
})

// Get active (running) generation execution for current user
export const getActiveExecution = query({
  args: {},
  handler: async (ctx, args) => {
    // Get userId from auth context
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to get active generation")
    }

    const execution = await ctx.db
      .query("agentGenerationExecutions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "running"))
      .first()

    return execution
  },
})

// Get all active executions for current user
export const getActiveExecutions = query({
  args: {},
  handler: async (ctx, args) => {
    // Get userId from auth context
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to get active generations")
    }

    const executions = await ctx.db
      .query("agentGenerationExecutions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "running"))
      .collect()

    return executions
  },
})

// Get a single execution by ID
export const get = query({
  args: {
    executionId: v.id("agentGenerationExecutions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.executionId)
  },
})
