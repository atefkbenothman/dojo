import { Doc } from "./_generated/dataModel"
import GitHub from "@auth/core/providers/github"
import { convexAuth } from "@convex-dev/auth/server"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      // If signing in, do nothing
      if (existingUserId) {
        return
      }
      // If signing up, clone all default MCPs and agents
      // Query all default MCPs
      const defaultMcps: Doc<"mcp">[] = await ctx.db
        .query("mcp")
        .filter((q) => q.eq(q.field("isPublic"), true))
        .collect()
      // Clone each default MCP for the new user
      for (const mcp of defaultMcps) {
        const { isPublic, userId: _oldUserId, _id, _creationTime, ...rest } = mcp
        await ctx.db.insert("mcp", {
          ...rest,
          userId,
        })
      }
      // If signing up, clone all default agents
      // Query all default agents
      const defaultAgents: Doc<"agents">[] = await ctx.db
        .query("agents")
        .filter((q) => q.eq(q.field("isPublic"), true))
        .collect()
      // Clone each default agent for the new user
      for (const agent of defaultAgents) {
        const { isPublic, userId: _oldUserId, _id, _creationTime, ...rest } = agent
        await ctx.db.insert("agents", {
          ...rest,
          userId,
        })
      }
      // If signing up, clone all default workflows
      // Query all default workflows
      const defaultWorkflows: Doc<"workflows">[] = await ctx.db
        .query("workflows")
        .filter((q) => q.eq(q.field("isPublic"), true))
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
  },
})
