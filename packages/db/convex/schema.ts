import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const providersFields = {
  providerId: v.string(),
  name: v.string(),
}

export const modelsFields = {
  modelId: v.string(),
  name: v.string(),
  providerId: v.id("providers"),
  requiresApiKey: v.boolean(),
  type: v.string(),
}

export const mcpFields = {
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
}

export const agentsFields = {
  mcpServers: v.array(v.id("mcp")),
  name: v.string(),
  outputType: v.union(v.literal("text"), v.literal("object")),
  systemPrompt: v.string(),
}

export const workflowsFields = {
  name: v.string(),
  description: v.string(),
  instructions: v.string(),
  steps: v.array(v.id("agents")),
  aiModelId: v.id("models"),
}

export default defineSchema({
  providers: defineTable(providersFields),
  models: defineTable(modelsFields),
  mcp: defineTable(mcpFields),
  agents: defineTable(agentsFields),
  workflows: defineTable(workflowsFields),
})
