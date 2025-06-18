import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Create a new execution
export const create = mutation({
  args: {
    workflowId: v.id("workflows"),
    sessionId: v.id("sessions"),
    userId: v.optional(v.id("users")),
    totalSteps: v.number(),
    agentIds: v.array(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const executionId = await ctx.db.insert("workflowExecutions", {
      workflowId: args.workflowId,
      sessionId: args.sessionId,
      userId: args.userId,
      totalSteps: args.totalSteps,
      status: "preparing",
      currentStep: undefined,
      stepExecutions: args.agentIds.map((agentId, index) => ({
        stepIndex: index,
        agentId: agentId,
        status: "pending" as const,
        startedAt: undefined,
        completedAt: undefined,
        error: undefined,
      })),
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
    executionId: v.id("workflowExecutions"),
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

// Update step progress
export const updateStepProgress = mutation({
  args: {
    executionId: v.id("workflowExecutions"),
    stepIndex: v.number(),
    agentId: v.id("agents"),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    if (!execution) throw new Error("Execution not found")

    const stepExecutions = [...(execution.stepExecutions || [])]
    const stepToUpdate = stepExecutions[args.stepIndex]

    if (!stepToUpdate) {
      throw new Error(`Step ${args.stepIndex} not found`)
    }

    // Update the specific step
    stepExecutions[args.stepIndex] = {
      ...stepToUpdate,
      agentId: args.agentId, // This should match what was set at creation
      status: args.status,
      error: args.error,
      startedAt: args.status === "running" ? Date.now() : stepToUpdate.startedAt,
      completedAt: args.status === "completed" || args.status === "failed" ? Date.now() : undefined,
    }

    const updates: any = {
      stepExecutions,
    }

    // Update currentStep if this step is running
    if (args.status === "running") {
      updates.currentStep = args.stepIndex
      updates.status = "running" // Ensure workflow status is running
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
    let query = ctx.db.query("workflowExecutions").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    return await query.collect()
  },
})

// Get active execution for a workflow
export const getActiveExecution = query({
  args: {
    workflowId: v.id("workflows"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("workflowExecutions")
      .withIndex("by_session_status", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) =>
        q.and(
          q.eq(q.field("workflowId"), args.workflowId),
          q.or(q.eq(q.field("status"), "preparing"), q.eq(q.field("status"), "running")),
        ),
      )
      .first()

    return execution
  },
})
