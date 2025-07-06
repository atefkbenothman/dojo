import { api } from "./_generated/api"
import { Doc } from "./_generated/dataModel"
import { FunctionReturnType } from "convex/server"

export type AIModel = Doc<"models">
export type Provider = Doc<"providers">
export type MCPServer = Doc<"mcp">
export type Agent = Doc<"agents">
export type Workflow = Doc<"workflows">
export type WorkflowExecution = Doc<"workflowExecutions">
export type WorkflowNode = Doc<"workflowNodes">
export type MCPConnection = Doc<"mcpConnections">
export type ApiKey = Doc<"apiKeys">
export type Session = Doc<"sessions">

export type AIModelWithProvider = FunctionReturnType<typeof api.models.modelsWithProviders>
export type AIModelWithAvailability = FunctionReturnType<typeof api.models.modelsWithAvailability>

// Derived types for better type safety
export type NodeExecutionStatus = "pending" | "connecting" | "running" | "completed" | "failed" | "cancelled"
export type WorkflowExecutionStatus = "preparing" | "running" | "completed" | "failed" | "cancelled"
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

// MCP Tool structure for better type safety
export interface MCPTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  [key: string]: unknown
}

export interface MCPToolsCollection {
  [toolName: string]: MCPTool
}

// MCP Server allowed commands for stdio transport
export const ALLOWED_STDIO_COMMANDS = ["npx", "uvx"] as const
export type AllowedStdioCommand = (typeof ALLOWED_STDIO_COMMANDS)[number]
