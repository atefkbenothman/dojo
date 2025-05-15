export interface Server {
  id: string
  name: string
  summary: string
}

export interface MCPServers {
  [k: string]: Server
}

export interface AIModelInfo {
  id: string
  name: string
  type: "text" | "image"
}

export interface MCPServerConfig {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface MCPConfigs {
  [k: string]: MCPServerConfig
}

export interface AgentConfig {
  id: string
  name: string
  modelId: string
  systemPrompt: string
  mcpServers: MCPServerConfig[]
  maxExecutionSteps: number
}

export interface AgentConfigs {
  [k: string]: AgentConfig
}
