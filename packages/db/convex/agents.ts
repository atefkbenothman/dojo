import { Id } from "./_generated/dataModel"
import { mutation, query, QueryCtx } from "./_generated/server"
import { agentsFields } from "./schema"
import { v } from "convex/values"

// Helper to get current userId (or null if not authenticated)
async function getCurrentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return identity.subject.split("|")[0] as Id<"users">
}

// Helper to validate that public agents use free models
async function validatePublicAgentModel(ctx: QueryCtx, isPublic: boolean | undefined, modelId: Id<"models">) {
  if (isPublic) {
    const model = await ctx.db.get(modelId)
    if (!model) throw new Error("Model not found")
    if (model.requiresApiKey) {
      throw new Error("Public agents must use free models that don't require API keys")
    }
  }
}

// List: Return all public agents and, if authenticated, also user-specific agents
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)

    // Always get public agents
    const publicAgents = await ctx.db
      .query("agents")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect()

    if (userId) {
      // Authenticated: also get user's private agents
      const userAgents = await ctx.db
        .query("agents")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.neq(q.field("isPublic"), true))
        .collect()

      return [...publicAgents, ...userAgents]
    } else {
      // Not authenticated: return only public agents
      return publicAgents
    }
  },
})

// Get: Return a single agent if it's public or belongs to the user
export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const agent = await ctx.db.get(args.id)
    if (!agent) return null
    if (agent.isPublic || (userId && agent.userId === userId)) {
      return agent
    }
    throw new Error("Unauthorized")
  },
})

// Edit: Only allow editing if not public and user is the owner
export const edit = mutation({
  args: {
    id: v.id("agents"),
    ...agentsFields,
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const userId = await getCurrentUserId(ctx)
    const agent = await ctx.db.get(id)
    if (!agent) throw new Error("Not found")
    if (agent.isPublic) throw new Error("Default agents cannot be edited.")
    if (!userId || agent.userId !== userId) throw new Error("Unauthorized")

    // Force isPublic to remain unchanged (prevent users from editing this field)
    const updatedData = { ...rest, isPublic: agent.isPublic }

    // Validate model choice for public agents
    await validatePublicAgentModel(ctx, agent.isPublic, rest.aiModelId)

    return await ctx.db.replace(id, { ...agent, ...updatedData })
  },
})

// Create: Only allow creating user-specific agents (not public)
export const create = mutation({
  args: agentsFields,
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error("Must be signed in to create agents.")

    // Force isPublic to false for all user-created agents
    const agentData = { ...args, isPublic: false, userId }

    return await ctx.db.insert("agents", agentData)
  },
})

// Remove: Only allow deleting if not public and user is the owner
export const remove = mutation({
  args: {
    id: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const agent = await ctx.db.get(args.id)
    if (!agent) throw new Error("Not found")
    if (agent.isPublic) throw new Error("Default agents cannot be deleted.")
    if (!userId || agent.userId !== userId) throw new Error("Unauthorized")
    return await ctx.db.delete(args.id)
  },
})

// Clone: Create a private copy of any agent (public or user's own)
export const clone = mutation({
  args: {
    id: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error("Must be signed in to clone agents.")

    const originalAgent = await ctx.db.get(args.id)
    if (!originalAgent) throw new Error("Agent not found")

    // Check if user can access this agent (either public or owned by user)
    if (!originalAgent.isPublic && originalAgent.userId !== userId) {
      throw new Error("Unauthorized")
    }

    // Create a clone with isPublic: false and new userId
    const { _id, _creationTime, userId: _originalUserId, isPublic: _originalIsPublic, ...agentData } = originalAgent

    return await ctx.db.insert("agents", {
      ...agentData,
      name: `${originalAgent.name} (Copy)`,
      userId,
      isPublic: false, // Always make clones private
    })
  },
})
