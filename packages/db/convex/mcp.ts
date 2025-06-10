import { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { QueryCtx } from "./_generated/server"
import { mcpFields } from "./schema"
import { v } from "convex/values"

// Helper to get current userId (or null if not authenticated)
async function getCurrentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return identity.subject.split("|")[0] as Id<"users">
}

// List: Return all public MCPs and, if authenticated, user-specific MCPs
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (userId) {
      // Authenticated: return only the user's MCPs
      return await ctx.db
        .query("mcp")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect()
    } else {
      // Not authenticated: return only public MCPs
      return await ctx.db
        .query("mcp")
        .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
        .collect()
    }
  },
})

// Get: Return a single MCP if it's public or belongs to the user
export const get = query({
  args: {
    id: v.id("mcp"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const mcp = await ctx.db.get(args.id)
    if (!mcp) return null
    if (mcp.isPublic || (userId && mcp.userId === userId)) {
      return mcp
    }
    throw new Error("Unauthorized")
  },
})

// Edit: Only allow editing if not public and user is the owner
export const edit = mutation({
  args: {
    id: v.id("mcp"),
    ...mcpFields,
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const userId = await getCurrentUserId(ctx)
    const mcp = await ctx.db.get(id)
    if (!mcp) throw new Error("Not found")
    if (mcp.isPublic) throw new Error("Default MCP servers cannot be edited.")
    if (!userId || mcp.userId !== userId) throw new Error("Unauthorized")
    return await ctx.db.replace(id, { ...mcp, ...rest })
  },
})

// Create: Only allow creating user-specific MCPs (not public)
export const create = mutation({
  args: mcpFields,
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (args.isPublic) throw new Error("Cannot create public MCP servers.")
    if (!userId) throw new Error("Must be signed in to create MCP servers.")
    return await ctx.db.insert("mcp", { ...args, userId })
  },
})

// Remove: Only allow deleting if not public and user is the owner
export const remove = mutation({
  args: {
    id: v.id("mcp"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const mcp = await ctx.db.get(args.id)
    if (!mcp) throw new Error("Not found")
    if (mcp.isPublic) throw new Error("Default MCP servers cannot be deleted.")
    if (!userId || mcp.userId !== userId) throw new Error("Unauthorized")
    return await ctx.db.delete(args.id)
  },
})
