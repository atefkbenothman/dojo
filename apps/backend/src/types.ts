import { ImageModel, LanguageModel } from "ai"
import { MCPClient } from "./mcp-client"

export interface MCPServer {
  id: string
  name: string
  summary: string
}

export interface MCPServerConfig {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface AIModelConfig {
  name: string
  modelName: string
  languageModel: LanguageModel
}

export interface AIImageModelConfig {
  name: string
  modelName: string
  imageModel: ImageModel
  provider: "openai"
}

export interface GenerateImageOptions {
  n?: number
  size?: string
  quality?: string
  style?: string
}

export interface ActiveMcpClient {
  client: MCPClient
  config: MCPServerConfig
}

export interface UserSession {
  activeMcpClients: Map<string, ActiveMcpClient>
}

export type FileChangeType = "add" | "change" | "unlink"

export interface FileChangeEvent {
  type: FileChangeType
  path: string
}

export interface FileBatchChangeEvent {
  event: "fileBatchChanged"
  changes: FileChangeEvent[]
}

export interface AgentConfig {
  id: string
  name: string
  modelId: string
  systemPrompt: string
  mcpServers: MCPServerConfig[]
  maxExecutionSteps: number
}

export type AgentConfigs = Record<string, AgentConfig>
