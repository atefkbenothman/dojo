import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

// AI providers (OpenAI, Anthropic, etc.)
export const providersFields = {
  providerId: v.string(),
  name: v.string(),
}

// AI models (gpt-4o, claude-3-5-sonnet, etc.)
export const modelsFields = {
  modelId: v.string(),
  name: v.string(),
  providerId: v.id("providers"),
  requiresApiKey: v.boolean(),
  type: v.string(),
}

// MCP server configurations
export const mcpFields = {
  userId: v.optional(v.id("users")),
  name: v.string(),
  summary: v.optional(v.string()),
  config: v.object({
    command: v.string(),
    args: v.array(v.string()),
    requiresEnv: v.optional(v.array(v.string())),
    env: v.optional(v.record(v.string(), v.string())),
  }),
  localOnly: v.optional(v.boolean()),
  requiresUserKey: v.boolean(),
  isPublic: v.optional(v.boolean()),
}

// Agent configurations
export const agentsFields = {
  userId: v.optional(v.id("users")),
  mcpServers: v.array(v.id("mcp")),
  name: v.string(),
  outputType: v.union(v.literal("text"), v.literal("object")),
  systemPrompt: v.string(),
  isPublic: v.optional(v.boolean()),
}

// Workflow configurations
export const workflowsFields = {
  userId: v.optional(v.id("users")),
  name: v.string(),
  description: v.string(),
  instructions: v.string(),
  steps: v.array(v.id("agents")),
  aiModelId: v.id("models"),
  isPublic: v.optional(v.boolean()),
}

// API key configurations for AI providers
export const apiKeysFields = {
  userId: v.id("users"),
  providerId: v.id("providers"),
  apiKey: v.string(),
}

// User session configurations
export const sessionsFields = {
  clientSessionId: v.optional(v.string()),
  userId: v.optional(v.id("users")),
  activeMcpServerIds: v.array(v.id("mcp")),
  runningAgentIds: v.optional(v.array(v.id("agents"))),
  lastAccessed: v.number(),
}

export default defineSchema({
  ...authTables,
  providers: defineTable(providersFields),
  models: defineTable(modelsFields).index("by_modelId", ["modelId"]),
  mcp: defineTable(mcpFields).index("by_userId", ["userId"]).index("by_isPublic", ["isPublic"]),
  agents: defineTable(agentsFields).index("by_userId", ["userId"]).index("by_isPublic", ["isPublic"]),
  workflows: defineTable(workflowsFields).index("by_userId", ["userId"]).index("by_isPublic", ["isPublic"]),
  apiKeys: defineTable(apiKeysFields)
    .index("by_user", ["userId"])
    .index("by_provider", ["providerId"])
    .index("by_user_provider", ["userId", "providerId"]),
  sessions: defineTable(sessionsFields).index("by_user", ["userId"]).index("by_clientSessionId", ["clientSessionId"]),
})
