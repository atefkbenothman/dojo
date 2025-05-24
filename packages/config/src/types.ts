import type { ProviderId } from "./config.js"

export interface AIModel {
  id: string
  name: string
  modelName: string
  type: "text" | "image"
  provider: ProviderId
  requiresApiKey?: boolean
}

export interface MCPServer {
  id: string
  name: string
  summary?: string
  requiresUserKey?: boolean
  config?: MCPServerConfig
  localOnly?: boolean
}

export interface MCPServerConfig {
  command: string
  args: string[]
  env?: Record<string, string>
  requiresEnv?: string[]
}

export interface AgentConfig {
  id: string
  name: string
  modelId: string
  systemPrompt: string
  mcpServers: MCPServer[]
  maxExecutionSteps: number
}
