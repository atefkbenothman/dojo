import { LanguageModel } from "ai"
import { MCPClient } from "./mcp-client"

// Store active connections
export interface ActiveConnection {
  serverId: string
  client: MCPClient
  lastActivityTimestamp: number
}

// Available MCP Server Configs
export interface MCPServerConfig {
  displayName: string
  command: string
  args: string[]
  cwd?: string
  userArgs?: boolean
}

// Available AI Models
export interface AIModelConfig {
  name: string
  modelName: string
  languageModel: LanguageModel
}
