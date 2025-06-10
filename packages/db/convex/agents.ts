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

// List: Return all public agents and, if authenticated, user-specific agents
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (userId) {
      // Authenticated: return only the user's agents
      return await ctx.db
        .query("agents")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect()
    } else {
      // Not authenticated: return only public agents
      return await ctx.db
        .query("agents")
        .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
        .collect()
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
    return await ctx.db.replace(id, { ...agent, ...rest })
  },
})

// Create: Only allow creating user-specific agents (not public)
export const create = mutation({
  args: agentsFields,
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (args.isPublic) throw new Error("Cannot create public agents.")
    if (!userId) throw new Error("Must be signed in to create agents.")
    return await ctx.db.insert("agents", { ...args, userId })
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
