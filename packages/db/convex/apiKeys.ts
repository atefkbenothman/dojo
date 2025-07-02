import { Id } from "./_generated/dataModel"
import { mutation, query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"

// Helper to get current userId (or null if not authenticated)
async function getCurrentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return identity.subject.split("|")[0] as Id<"users">
}

// For frontend use - extracts userId from auth
export const getMyApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
  },
})

export const getApiKeyForUserAndModel = query({
  args: { userId: v.id("users"), modelId: v.id("models") },
  handler: async (ctx, args) => {
    const model = await ctx.db.get(args.modelId)
    if (!model) {
      return null
    }
    const providerId = model.providerId
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("providerId", providerId))
      .unique()
    return apiKey
  },
})

export const getApiKeyForUserAndProvider = query({
  args: {
    userId: v.id("users"),
    providerId: v.id("providers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("providerId", args.providerId))
      .unique()
  },
})

export const upsertApiKey = mutation({
  args: { providerId: v.id("providers"), apiKey: v.string() },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to manage API keys")
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("providerId", args.providerId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { apiKey: args.apiKey })
      return existing._id
    } else {
      return await ctx.db.insert("apiKeys", { userId, providerId: args.providerId, apiKey: args.apiKey })
    }
  },
})

export const removeApiKey = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to manage API keys")
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("providerId", args.providerId))
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
      return existing._id
    }
    return null
  },
})
