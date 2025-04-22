import {
  FinishReason,
  LanguageModel,
  TextStreamPart,
  ToolCallPart,
  ToolResultPart,
  ToolSet,
} from "ai"
import { MCPClient } from "./client"

export interface ActiveConnection {
  client: MCPClient
  lastActivityTimestamp: number
}

export interface MCPServer {
  id: string
  name: string
  summary: string
}

export interface MCPServerConfig {
  id: string
  displayName: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface AIModelConfig {
  name: string
  modelName: string
  languageModel: LanguageModel
}

export type ChatStreamPart =
  | TextStreamPart<ToolSet>
  | ToolCallPart
  | ToolResultPart
  | { type: "error"; error: unknown }
  | {
      type: "finish"
      reason: FinishReason | string
      usage?: {
        completionTokens: number
        promptTokens: number
        totalTokens: number
      }
    }
