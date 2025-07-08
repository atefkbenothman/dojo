import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Create a new execution
export const create = mutation({
  args: {
    workflowId: v.id("workflows"),
    sessionId: v.id("sessions"),
    totalSteps: v.number(),
    agentIds: v.array(v.id("agents")),
  },
  handler: async (ctx, args) => {
    // Get userId from session
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

    const executionId = await ctx.db.insert("workflowExecutions", {
      workflowId: args.workflowId,
      sessionId: args.sessionId,
      userId: session.userId || undefined,
      totalSteps: args.totalSteps,
      status: "preparing",
      nodeExecutions: [], // Will be populated as nodes execute
      currentNodes: [], // Will track currently running nodes
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

// Request cancellation of a workflow execution
export const requestCancellation = mutation({
  args: {
    executionId: v.id("workflowExecutions"),
    strategy: v.optional(v.union(v.literal("graceful"), v.literal("immediate"))),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    if (!execution) throw new Error("Execution not found")

    // Only allow cancellation if the execution is still running
    if (execution.status !== "preparing" && execution.status !== "running") {
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

// Get a single execution by ID
export const get = query({
  args: {
    executionId: v.id("workflowExecutions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.executionId)
  },
})

// Update node progress (NEW: for tree-based workflows)
export const updateNodeProgress = mutation({
  args: {
    executionId: v.id("workflowExecutions"),
    nodeId: v.string(),
    agentId: v.optional(v.id("agents")),
    status: v.union(
      v.literal("pending"),
      v.literal("connecting"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    error: v.optional(v.string()),
    output: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        usage: v.optional(
          v.object({
            promptTokens: v.number(),
            completionTokens: v.number(),
            totalTokens: v.number(),
          }),
        ),
        toolCalls: v.optional(
          v.array(
            v.object({
              toolCallId: v.string(),
              toolName: v.string(),
              args: v.any(),
            }),
          ),
        ),
        model: v.optional(v.string()),
        finishReason: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    if (!execution) throw new Error("Execution not found")

    const nodeExecutions = [...execution.nodeExecutions]

    // Find existing node execution or create new one
    let nodeExecution = nodeExecutions.find((ne) => ne.nodeId === args.nodeId)
    if (!nodeExecution) {
      nodeExecution = {
        nodeId: args.nodeId,
        agentId: args.agentId,
        status: "pending" as const,
        startedAt: undefined,
        completedAt: undefined,
        error: undefined,
        output: undefined,
        metadata: undefined,
      }
      nodeExecutions.push(nodeExecution)
    }

    // Update the node execution
    const index = nodeExecutions.findIndex((ne) => ne.nodeId === args.nodeId)
    nodeExecutions[index] = {
      ...nodeExecution,
      status: args.status,
      error: args.error,
      output: args.output !== undefined ? args.output : nodeExecution.output,
      metadata: args.metadata !== undefined ? args.metadata : nodeExecution.metadata,
      startedAt: args.status === "running" ? Date.now() : nodeExecution.startedAt,
      completedAt: args.status === "completed" || args.status === "failed" ? Date.now() : undefined,
    }

    // Update current nodes for tracking multiple children execution
    let currentNodes = [...execution.currentNodes]
    if (args.status === "running") {
      if (!currentNodes.includes(args.nodeId)) {
        currentNodes.push(args.nodeId)
      }
    } else if (args.status === "completed" || args.status === "failed" || args.status === "cancelled") {
      currentNodes = currentNodes.filter((nodeId) => nodeId !== args.nodeId)
    }

    // Update node executions and current nodes
    const updates: any = {
      nodeExecutions,
      currentNodes,
    }

    // Only update workflow status to "running" when nodes are active
    // Don't change the status when all nodes complete - let the workflow service
    // determine the final status based on success/failure
    if (currentNodes.length > 0) {
      updates.status = "running"
    }

    await ctx.db.patch(args.executionId, updates)
  },
})

// Cancel an entire branch when a node fails (Phase 1 of Convex migration)
export const cancelBranch = mutation({
  args: {
    executionId: v.id("workflowExecutions"),
    failedNodeId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    if (!execution) throw new Error("Execution not found")

    // Get all workflow nodes to perform tree traversal
    const workflowNodes = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", execution.workflowId))
      .collect()

    // Helper function to find all descendants using breadth-first search
    const findAllDescendants = (nodeId: string): string[] => {
      const descendants: string[] = []
      const queue = [nodeId]

      while (queue.length > 0) {
        const currentId = queue.shift()!
        const children = workflowNodes.filter((n) => n.parentNodeId === currentId)

        for (const child of children) {
          descendants.push(child.nodeId)
          queue.push(child.nodeId)
        }
      }

      return descendants
    }

    // Get all descendant node IDs
    const descendantNodeIds = findAllDescendants(args.failedNodeId)

    if (descendantNodeIds.length === 0) {
      // No descendants to cancel
      return { cancelledCount: 0 }
    }

    // Update node executions to cancel all descendants
    const nodeExecutions = [...execution.nodeExecutions]

    let cancelledCount = 0
    for (const nodeExecution of nodeExecutions) {
      if (descendantNodeIds.includes(nodeExecution.nodeId)) {
        // Only cancel if not already in a final state
        if (
          nodeExecution.status === "pending" ||
          nodeExecution.status === "connecting" ||
          nodeExecution.status === "running"
        ) {
          nodeExecution.status = "cancelled"
          nodeExecution.error = args.reason
          nodeExecution.completedAt = Date.now()
          cancelledCount++
        }
      }
    }

    // Add missing descendant nodes that haven't been created yet
    for (const descendantNodeId of descendantNodeIds) {
      const existingExecution = nodeExecutions.find((ne) => ne.nodeId === descendantNodeId)
      if (!existingExecution) {
        // Find the corresponding workflow node to get agentId
        const workflowNode = workflowNodes.find((n) => n.nodeId === descendantNodeId)
        if (workflowNode) {
          nodeExecutions.push({
            nodeId: descendantNodeId,
            agentId: workflowNode.agentId,
            status: "cancelled",
            startedAt: undefined,
            completedAt: Date.now(),
            error: args.reason,
            output: undefined,
            metadata: undefined,
          })
          cancelledCount++
        }
      }
    }

    // Update current nodes to remove any cancelled nodes
    const currentNodes = execution.currentNodes.filter((nodeId) => !descendantNodeIds.includes(nodeId))

    // Update the execution with cancelled descendants
    await ctx.db.patch(args.executionId, {
      nodeExecutions,
      currentNodes,
    })

    return { cancelledCount }
  },
})
