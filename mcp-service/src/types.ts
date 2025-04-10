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
  requiredEnvVars?: string[]
  cwd?: string
  env?: Record<string, string>
}
