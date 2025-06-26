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
    return await ctx.db.insert("workflows", { ...args, userId })
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
