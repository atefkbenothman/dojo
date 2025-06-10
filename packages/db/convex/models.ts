import { Id } from "./_generated/dataModel"
import { query } from "./_generated/server"
import { v } from "convex/values"

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

export const providers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("providers").collect()
  },
})
