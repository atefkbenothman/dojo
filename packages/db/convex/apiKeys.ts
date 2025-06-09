import { query } from "./_generated/server"
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
