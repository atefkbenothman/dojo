import { Id } from "./_generated/dataModel.js"
import { mutation, query } from "./_generated/server.js"
import { mcpFields } from "./schema.js"
import { v } from "convex/values"

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("mcp").collect()
  },
})

export const get = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id as Id<"mcp">)
  },
})

export const edit = mutation({
  args: {
    id: v.id("mcp"),
    ...mcpFields,
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    return await ctx.db.replace(id, rest)
  },
})

export const create = mutation({
  args: mcpFields,
  handler: async (ctx, args) => {
    return await ctx.db.insert("mcp", args)
  },
})

export const remove = mutation({
  args: {
    id: v.id("mcp"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})
