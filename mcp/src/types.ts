import { LanguageModel } from "ai"
import { MCPClient } from "./client"

export interface ActiveConnection {
  serverId: string
  client: MCPClient
  lastActivityTimestamp: number
}

export interface MCPServerConfig {
  id: string
  displayName: string
  command: string
  args: string[]
  cwd?: string
  userArgs?: boolean
  env?: Record<string, string>
  summary: string
}

export interface AIModelConfig {
  name: string
  modelName: string
  languageModel: LanguageModel
}
