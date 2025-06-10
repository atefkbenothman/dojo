import { internal } from "./_generated/api"
import { Doc } from "./_generated/dataModel"
import { internalMutation } from "./_generated/server"
import GitHub from "@auth/core/providers/github"
import { convexAuth } from "@convex-dev/auth/server"
import { v } from "convex/values"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      // If signing in, do nothing
      if (existingUserId) {
        return
      }
      await ctx.runMutation(internal.auth.cloneDefaultConfigForUser, { userId })
    },
  },
})

export const cloneDefaultConfigForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // If signing up, clone all default MCPs, agents, and workflows
    // Query all default MCPs
    const defaultMcps: Doc<"mcp">[] = await ctx.db
      .query("mcp")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect()
    // Clone each default MCP for the new user
    for (const mcp of defaultMcps) {
      const { isPublic, userId: _oldUserId, _id, _creationTime, ...rest } = mcp
      await ctx.db.insert("mcp", {
        ...rest,
        userId,
      })
    }
    // Query all default agents
    const defaultAgents: Doc<"agents">[] = await ctx.db
      .query("agents")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect()
    // Clone each default agent for the new user
    for (const agent of defaultAgents) {
      const { isPublic, userId: _oldUserId, _id, _creationTime, ...rest } = agent
      await ctx.db.insert("agents", {
        ...rest,
        userId,
      })
    }
    // Query all default workflows
    const defaultWorkflows: Doc<"workflows">[] = await ctx.db
      .query("workflows")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect()
    // Clone each default workflow for the new user
    for (const workflow of defaultWorkflows) {
      const { isPublic, userId: _oldUserId, _id, _creationTime, ...rest } = workflow
      await ctx.db.insert("workflows", {
        ...rest,
        userId,
      })
    }
  },
})
