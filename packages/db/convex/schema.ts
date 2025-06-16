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
  lastAccessed: v.number(),
}

// Workflow execution tracking
export const workflowExecutionsFields = {
  // Core fields
  workflowId: v.id("workflows"),
  sessionId: v.id("sessions"),
  userId: v.optional(v.id("users")), // For authenticated users

  // Status tracking
  status: v.union(
    v.literal("preparing"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled"),
  ),

  // Progress tracking
  currentStep: v.optional(v.number()), // 0-based index
  totalSteps: v.number(),

  // Step-level tracking
  stepExecutions: v.optional(
    v.array(
      v.object({
        stepIndex: v.number(),
        agentId: v.id("agents"),
        status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed")),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        error: v.optional(v.string()),
      }),
    ),
  ),

  // Execution context
  aiModelId: v.id("models"),
  error: v.optional(v.string()),

  // Timestamps
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
}

// MCP connection tracking
export const mcpConnectionsFields = {
  // Core fields
  mcpServerId: v.id("mcp"),
  sessionId: v.id("sessions"),
  userId: v.optional(v.id("users")),

  // Backend instance tracking
  backendInstanceId: v.string(), // To track which backend instance owns this connection

  // Status tracking
  status: v.union(
    v.literal("connecting"),
    v.literal("connected"),
    v.literal("disconnecting"),
    v.literal("disconnected"),
    v.literal("error"),
  ),

  // Connection metadata
  error: v.optional(v.string()),

  // Timestamps
  connectedAt: v.number(),
  lastHeartbeat: v.number(), // Backend updates this periodically
  disconnectedAt: v.optional(v.number()),
}

// Agent execution tracking
export const agentExecutionsFields = {
  // Core fields
  agentId: v.id("agents"),
  sessionId: v.id("sessions"),
  userId: v.optional(v.id("users")),

  // Status tracking
  status: v.union(
    v.literal("preparing"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled"),
  ),

  // Execution context
  aiModelId: v.id("models"),
  mcpServerIds: v.array(v.id("mcp")), // MCP servers used for this execution
  error: v.optional(v.string()),

  // Timestamps
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
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
  workflowExecutions: defineTable(workflowExecutionsFields)
    .index("by_session", ["sessionId"])
    .index("by_workflow", ["workflowId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_session_status", ["sessionId", "status"]),
  mcpConnections: defineTable(mcpConnectionsFields)
    .index("by_session", ["sessionId"])
    .index("by_mcp", ["mcpServerId"])
    .index("by_session_mcp", ["sessionId", "mcpServerId"])
    .index("by_backend", ["backendInstanceId"])
    .index("by_status", ["status"]),
  agentExecutions: defineTable(agentExecutionsFields)
    .index("by_session", ["sessionId"])
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_session_status", ["sessionId", "status"]),
})
