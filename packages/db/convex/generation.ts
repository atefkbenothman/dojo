import { Id } from "./_generated/dataModel"
import { mutation, query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"

// Helper to get current userId from auth context
async function getCurrentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return identity.subject.split("|")[0] as Id<"users">
}

// Mutations for AI generation - use auth context from forwarded JWT token

// Create agent for authenticated user
export const createAgentForUser = mutation({
  args: {
    name: v.string(),
    systemPrompt: v.string(),
    mcpServers: v.array(v.id("mcp")),
    outputType: v.union(v.literal("text"), v.literal("object")),
    aiModelId: v.id("models"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Get userId from auth context
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to create agents")
    }

    // Create the agent data
    const agentData = {
      name: args.name,
      systemPrompt: args.systemPrompt,
      mcpServers: args.mcpServers,
      outputType: args.outputType,
      aiModelId: args.aiModelId,
      isPublic: args.isPublic,
      userId,
    }

    // Insert the agent
    const agentId = await ctx.db.insert("agents", agentData)
    return { agentId }
  },
})

// Create workflow for authenticated user
export const createWorkflowForUser = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    instructions: v.string(),
    steps: v.array(
      v.object({
        nodeId: v.string(),
        name: v.string(),
        agentId: v.id("agents"),
        input: v.string(),
      }),
    ),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Get userId from auth context
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to create workflows")
    }

    // Create the workflow
    const workflowData = {
      name: args.name,
      description: args.description,
      instructions: args.instructions,
      rootNodeId: args.steps.length > 0 ? args.steps[0]?.nodeId : undefined,
      isPublic: args.isPublic,
      userId,
    }

    const workflowId = await ctx.db.insert("workflows", workflowData)

    // Create the workflow nodes
    for (let i = 0; i < args.steps.length; i++) {
      const step = args.steps[i]
      if (!step) continue

      const prevStep = i > 0 ? args.steps[i - 1] : undefined
      const nodeData = {
        workflowId,
        nodeId: step.nodeId,
        parentNodeId: prevStep?.nodeId,
        type: "step" as const,
        agentId: step.agentId,
        name: step.name,
        input: step.input,
      }
      await ctx.db.insert("workflowNodes", nodeData)
    }

    return { workflowId }
  },
})

// Get MCP servers for authenticated user
export const getMcpServersForUser = query({
  args: {},
  handler: async (ctx) => {
    // Get userId from auth context
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to get MCP servers")
    }

    // Get public MCP servers
    const publicMcpServers = await ctx.db
      .query("mcp")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect()

    // Get user's private MCP servers
    const userMcpServers = await ctx.db
      .query("mcp")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("isPublic"), true))
      .collect()

    return [...publicMcpServers, ...userMcpServers]
  },
})

// Get agents for authenticated user
export const getAgentsForUser = query({
  args: {},
  handler: async (ctx) => {
    // Get userId from auth context
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      throw new Error("Must be authenticated to get agents")
    }

    // Get public agents
    const publicAgents = await ctx.db
      .query("agents")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect()

    // Get user's private agents
    const userAgents = await ctx.db
      .query("agents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("isPublic"), true))
      .collect()

    return [...publicAgents, ...userAgents]
  },
})

// Get available models (for selecting AI model)
export const getModels = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("models").collect()
  },
})
