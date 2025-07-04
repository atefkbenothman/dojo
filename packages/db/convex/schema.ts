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
  transportType: v.union(v.literal("stdio"), v.literal("http"), v.literal("sse")),
  config: v.union(
    // Stdio config
    v.object({
      type: v.literal("stdio"),
      command: v.union(v.literal("npx"), v.literal("uvx")),
      args: v.array(v.string()),
      requiresEnv: v.optional(v.array(v.string())),
      env: v.optional(v.record(v.string(), v.string())),
    }),
    // HTTP config
    v.object({
      type: v.literal("http"),
      url: v.string(),
      headers: v.optional(v.record(v.string(), v.string())),
    }),
    // SSE config
    v.object({
      type: v.literal("sse"),
      url: v.string(),
      headers: v.optional(v.record(v.string(), v.string())),
    }),
  ),
  localOnly: v.optional(v.boolean()),
  requiresUserKey: v.boolean(),
  isPublic: v.optional(v.boolean()),
  isTemplate: v.optional(v.boolean()),
}

// Agent configurations
export const agentsFields = {
  userId: v.optional(v.id("users")),
  mcpServers: v.array(v.id("mcp")),
  name: v.string(),
  outputType: v.union(v.literal("text"), v.literal("object")),
  systemPrompt: v.string(),
  isPublic: v.optional(v.boolean()),
  aiModelId: v.id("models"),
}

// Workflow nodes for tree-based workflows
export const workflowNodesFields = {
  workflowId: v.id("workflows"),
  nodeId: v.string(), // Unique within workflow (e.g., "node_1", "node_2")
  parentNodeId: v.optional(v.string()), // Reference to parent node

  type: v.literal("step"), // All nodes are now agent execution steps

  // Step-specific data
  agentId: v.id("agents"), // Required for all step nodes

  // Display metadata
  label: v.optional(v.string()),
  order: v.optional(v.number()), // Child execution ordering for step nodes with multiple children
}

// Workflow configurations
export const workflowsFields = {
  userId: v.optional(v.id("users")),
  name: v.string(),
  description: v.string(),
  instructions: v.string(),
  rootNodeId: v.optional(v.string()), // Entry point for the workflow tree (set when first node is added)
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

  // Node-based execution tracking
  totalSteps: v.number(), // Count of step nodes for progress calculation
  nodeExecutions: v.array(
    v.object({
      nodeId: v.string(),
      agentId: v.optional(v.id("agents")),
      status: v.union(
        v.literal("pending"),
        v.literal("connecting"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      error: v.optional(v.string()),
      output: v.optional(v.string()),
      metadata: v.optional(
        v.object({
          usage: v.optional(
            v.object({
              promptTokens: v.number(),
              completionTokens: v.number(),
              totalTokens: v.number(),
            }),
          ),
          toolCalls: v.optional(
            v.array(
              v.object({
                toolCallId: v.string(),
                toolName: v.string(),
                args: v.any(),
              }),
            ),
          ),
          model: v.optional(v.string()),
          finishReason: v.optional(v.string()),
        }),
      ),
    }),
  ),

  // Current nodes for tracking execution of multiple children
  currentNodes: v.array(v.string()), // Multiple nodes can be "current" when step nodes have multiple children

  // Execution context
  error: v.optional(v.string()),

  // Cancellation tracking
  cancellationRequested: v.optional(v.boolean()),

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

  // Execution tracking (for workflow-managed connections)
  workflowExecutionId: v.optional(v.id("workflowExecutions")), // If connection was auto-created by workflow
  agentExecutionId: v.optional(v.id("agentExecutions")), // If connection was auto-created by agent
  connectionType: v.union(v.literal("user"), v.literal("workflow"), v.literal("agent")), // Track connection source

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
    v.literal("connecting"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled"),
  ),

  // Execution context
  aiModelId: v.id("models"),
  mcpServerIds: v.array(v.id("mcp")), // MCP servers used for this execution
  error: v.optional(v.string()),

  // Cancellation tracking
  cancellationRequested: v.optional(v.boolean()),

  // Timestamps
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
}

// Agent generation execution tracking
export const agentGenerationExecutionsFields = {
  // Core fields
  userId: v.id("users"),
  prompt: v.string(),
  modelId: v.string(),

  // Status tracking
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
  ),

  // Result tracking
  error: v.optional(v.string()),
  agentId: v.optional(v.id("agents")), // Set when generation completes successfully

  // Timestamps
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
}

// Workflow generation execution tracking
export const workflowGenerationExecutionsFields = {
  // Core fields
  userId: v.id("users"),
  prompt: v.string(),
  modelId: v.string(),

  // Status tracking
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
  ),

  // Result tracking
  error: v.optional(v.string()),
  workflowId: v.optional(v.id("workflows")), // Set when generation completes successfully

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
  workflowNodes: defineTable(workflowNodesFields)
    .index("by_workflow", ["workflowId"])
    .index("by_parent", ["workflowId", "parentNodeId"])
    .index("by_workflow_nodeId", ["workflowId", "nodeId"]),
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
    .index("by_status", ["status"])
    .index("by_workflow_execution", ["workflowExecutionId"])
    .index("by_agent_execution", ["agentExecutionId"])
    .index("by_connection_type", ["connectionType"]),
  agentExecutions: defineTable(agentExecutionsFields)
    .index("by_session", ["sessionId"])
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_session_status", ["sessionId", "status"]),
  agentGenerationExecutions: defineTable(agentGenerationExecutionsFields)
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),
  workflowGenerationExecutions: defineTable(workflowGenerationExecutionsFields)
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),
})
