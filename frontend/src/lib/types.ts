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
