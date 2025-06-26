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

// List: Return all public MCPs and, if authenticated, also user-specific MCPs
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    
    // Always get public MCPs
    const publicMcps = await ctx.db
      .query("mcp")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect()
    
    if (userId) {
      // Authenticated: also get user's private MCPs
      const userMcps = await ctx.db
        .query("mcp")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.neq(q.field("isPublic"), true))
        .collect()
      
      return [...publicMcps, ...userMcps]
    } else {
      // Not authenticated: return only public MCPs
      return publicMcps
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
    // Spread mcpFields but exclude userId since it shouldn't be editable
    name: mcpFields.name,
    summary: mcpFields.summary,
    transportType: mcpFields.transportType,
    config: mcpFields.config,
    localOnly: mcpFields.localOnly,
    requiresUserKey: mcpFields.requiresUserKey,
    isPublic: mcpFields.isPublic,
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

// Clone: Create a private copy of any MCP server (public or user's own)
export const clone = mutation({
  args: {
    id: v.id("mcp"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error("Must be signed in to clone MCP servers.")
    
    const originalMcp = await ctx.db.get(args.id)
    if (!originalMcp) throw new Error("MCP server not found")
    
    // Check if user can access this MCP (either public or owned by user)
    if (!originalMcp.isPublic && originalMcp.userId !== userId) {
      throw new Error("Unauthorized")
    }
    
    // Create a clone with isPublic: false and new userId
    const { _id, _creationTime, userId: _originalUserId, isPublic: _originalIsPublic, ...mcpData } = originalMcp
    
    return await ctx.db.insert("mcp", {
      ...mcpData,
      name: `${originalMcp.name} (Copy)`,
      userId,
      isPublic: false, // Always make clones private
    })
  },
})
