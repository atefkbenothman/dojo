import { Id } from "./_generated/dataModel"
import { query } from "./_generated/server"
import { v } from "convex/values"

// Helper to get current userId (or null if not authenticated)
async function getCurrentUserId(ctx: any): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return identity.subject.split("|")[0] as Id<"users">
}

export const get = query({
  args: { id: v.id("models") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const getModelByModelId = query({
  args: { modelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("models")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .unique()
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("models").collect()
  },
})

export const modelsWithProviders = query({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db.query("models").collect()
    const modelsWithProviders = await Promise.all(
      models.map(async (model) => {
        const provider = await ctx.db.get(model.providerId as Id<"providers">)
        return { ...model, provider }
      }),
    )
    return modelsWithProviders
  },
})

// New query that includes availability based on user's API keys
export const modelsWithAvailability = query({
  args: {},
  handler: async (ctx) => {
    // Get current user
    const userId = await getCurrentUserId(ctx)

    // Fetch all models with providers
    const models = await ctx.db.query("models").collect()
    const providers = await ctx.db.query("providers").collect()

    // Fetch user's API keys if authenticated
    const userApiKeys = userId
      ? await ctx.db
          .query("apiKeys")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect()
      : []

    // Create a Set of provider IDs that have API keys
    const providersWithKeys = new Set(userApiKeys.map((key) => key.providerId))

    // Enhance models with availability
    const modelsWithAvailability = await Promise.all(
      models.map(async (model) => {
        const provider = providers.find((p) => p._id === model.providerId)

        // Model is available if:
        // 1. It doesn't require an API key (free models), OR
        // 2. User is authenticated AND has an API key for the model's provider
        const isAvailable = !model.requiresApiKey || (userId !== null && providersWithKeys.has(model.providerId))

        return {
          ...model,
          provider,
          isAvailable,
        }
      }),
    )

    return modelsWithAvailability
  },
})

export const providers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("providers").collect()
  },
})
