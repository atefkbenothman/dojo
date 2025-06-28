import { Id } from "./_generated/dataModel"
import { mutation, query, QueryCtx } from "./_generated/server"
import { workflowsFields } from "./schema"
import { v } from "convex/values"

// Helper to get current userId (or null if not authenticated)
async function getCurrentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return identity.subject.split("|")[0] as Id<"users">
}

// List: Return all public workflows and, if authenticated, also user-specific workflows
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    
    // Always get public workflows
    const publicWorkflows = await ctx.db
      .query("workflows")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect()
    
    if (userId) {
      // Authenticated: also get user's private workflows
      const userWorkflows = await ctx.db
        .query("workflows")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.neq(q.field("isPublic"), true))
        .collect()
      
      return [...publicWorkflows, ...userWorkflows]
    } else {
      // Not authenticated: return only public workflows
      return publicWorkflows
    }
  },
})

// Get: Return a single workflow if it's public or belongs to the user
export const get = query({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.id)
    if (!workflow) return null
    if (workflow.isPublic || (userId && workflow.userId === userId)) {
      return workflow
    }
    throw new Error("Unauthorized")
  },
})

// Edit: Only allow editing if not public and user is the owner
export const edit = mutation({
  args: {
    id: v.id("workflows"),
    ...workflowsFields,
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(id)
    if (!workflow) throw new Error("Not found")
    if (workflow.isPublic) throw new Error("Default workflows cannot be edited.")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")
    return await ctx.db.replace(id, { ...workflow, ...rest })
  },
})

// Create: Only allow creating user-specific workflows (not public)
export const create = mutation({
  args: workflowsFields,
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (args.isPublic) throw new Error("Cannot create public workflows.")
    if (!userId) throw new Error("Must be signed in to create workflows.")
    
    // Create the workflow (no auto-created nodes - user will add first step)
    const workflowId = await ctx.db.insert("workflows", { ...args, userId })
    
    return workflowId
  },
})

// Remove: Only allow deleting if not public and user is the owner
export const remove = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.id)
    if (!workflow) throw new Error("Not found")
    if (workflow.isPublic) throw new Error("Default workflows cannot be deleted.")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")
    return await ctx.db.delete(args.id)
  },
})

// Clone: Create a private copy of any workflow (public or user's own)
export const clone = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error("Must be signed in to clone workflows.")
    
    const originalWorkflow = await ctx.db.get(args.id)
    if (!originalWorkflow) throw new Error("Workflow not found")
    
    // Check if user can access this workflow (either public or owned by user)
    if (!originalWorkflow.isPublic && originalWorkflow.userId !== userId) {
      throw new Error("Unauthorized")
    }
    
    // Create a clone with isPublic: false and new userId
    const { _id, _creationTime, userId: _originalUserId, isPublic: _originalIsPublic, ...workflowData } = originalWorkflow
    
    return await ctx.db.insert("workflows", {
      ...workflowData,
      name: `${originalWorkflow.name} (Copy)`,
      userId,
      isPublic: false, // Always make clones private
    })
  },
})

// Add a new workflow node
export const addNode = mutation({
  args: {
    workflowId: v.id("workflows"),
    nodeId: v.string(),
    parentNodeId: v.optional(v.string()),
    type: v.union(v.literal("step"), v.literal("parallel")),
    agentId: v.optional(v.id("agents")),
    label: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.workflowId)

    if (!workflow) throw new Error("Workflow not found")
    if (workflow.isPublic) throw new Error("Cannot edit public workflows")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")

    return await ctx.db.insert("workflowNodes", args)
  },
})

// Remove a workflow node and its children
export const removeNode = mutation({
  args: {
    workflowId: v.id("workflows"),
    nodeId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.workflowId)

    if (!workflow) throw new Error("Workflow not found")
    if (workflow.isPublic) throw new Error("Cannot edit public workflows")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")

    // Helper function to recursively collect all descendants
    const collectDescendants = async (nodeId: string): Promise<Id<"workflowNodes">[]> => {
      const descendants: Id<"workflowNodes">[] = []
      
      // Find direct children
      const children = await ctx.db
        .query("workflowNodes")
        .withIndex("by_parent", (q) => q.eq("workflowId", args.workflowId).eq("parentNodeId", nodeId))
        .collect()
      
      // Add children and their descendants
      for (const child of children) {
        descendants.push(child._id)
        const childDescendants = await collectDescendants(child.nodeId)
        descendants.push(...childDescendants)
      }
      
      return descendants
    }

    // Find the node to delete
    const node = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow_nodeId", (q) => q.eq("workflowId", args.workflowId).eq("nodeId", args.nodeId))
      .first()

    if (!node) {
      throw new Error(`Node ${args.nodeId} not found`)
    }

    // Collect all nodes to delete (the node itself and all descendants)
    const nodesToDelete = [node._id]
    const descendants = await collectDescendants(args.nodeId)
    nodesToDelete.push(...descendants)

    // Delete all nodes in a single transaction
    for (const nodeId of nodesToDelete) {
      await ctx.db.delete(nodeId)
    }

    // If this was the root node, clear the workflow's rootNodeId
    if (workflow.rootNodeId === args.nodeId) {
      await ctx.db.patch(args.workflowId, { rootNodeId: undefined })
    }
  },
})

// Update a workflow node
export const updateNode = mutation({
  args: {
    workflowId: v.id("workflows"),
    nodeId: v.string(),
    agentId: v.optional(v.id("agents")),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.workflowId)

    if (!workflow) throw new Error("Workflow not found")
    if (workflow.isPublic) throw new Error("Cannot edit public workflows")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")

    // Find the node to update
    const node = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow_nodeId", (q) => q.eq("workflowId", args.workflowId).eq("nodeId", args.nodeId))
      .first()

    if (!node) throw new Error("Node not found")

    // Update the node
    const updateData: any = {}
    if (args.agentId !== undefined) updateData.agentId = args.agentId
    if (args.label !== undefined) updateData.label = args.label

    await ctx.db.patch(node._id, updateData)
  },
})

// Get all nodes for a workflow
export const getWorkflowNodes = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect()
  },
})
