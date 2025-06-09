import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const getApiKeysForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
  args: { userId: v.id("users"), providerId: v.id("providers"), apiKey: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("providerId", args.providerId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { apiKey: args.apiKey })
      return existing._id
    } else {
      return await ctx.db.insert("apiKeys", { userId: args.userId, providerId: args.providerId, apiKey: args.apiKey })
    }
  },
})

export const removeApiKey = mutation({
  args: { userId: v.id("users"), providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("providerId", args.providerId))
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
      return existing._id
    }
    return null
  },
})
