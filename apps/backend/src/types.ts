import { MCPClient } from "./mcp-client.js"
import type { AppRouter } from "./trpc/router.js"
import { MCPServerConfig } from "@dojo/config"
import type { AgentConfig as ExternalAgentConfig } from "@dojo/config"
import type { inferRouterOutputs, inferRouterInputs } from "@trpc/server"
import { type CoreMessage, type LanguageModel, type ToolSet } from "ai"
import { Request } from "express"
import { type Response as ExpressResponse } from "express"

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

export type AgentConfigs = Record<string, ExternalAgentConfig>

export interface RequestWithUserContext extends Request {
  userId: string
  userSession: UserSession
}

// Input structure for an agent
export interface AgentInput<TPreviousResult = unknown> {
  messages: CoreMessage[]
  languageModel: LanguageModel
  tools?: ToolSet
  previousAgentResult?: TPreviousResult // Output from the preceding agent
  // Add any other contextual data agents might need
}

// Output structure that an agent's execute method returns to the orchestrator (server-side)
// This is distinct from what it streams to the client via the ExpressResponse.
export interface AgentInternalOutput<TResult = unknown> {
  result: TResult // The primary result of the agent's execution for server-side use
  // Add metadata useful for subsequent agents or server logic
}

// The core Agent interface
export interface IAgent<TInputParams = unknown, TOutputResult = unknown> {
  name: string
  description: string

  /**
   * Executes the agent's core logic.
   * Streams output to the client via the ExpressResponse object.
   * Returns an internal result for use by the orchestrator or subsequent agents.
   */
  execute(input: AgentInput<TInputParams>, res: ExpressResponse): Promise<AgentInternalOutput<TOutputResult>>
}

export interface UserSession {
  userId: string
  activeMcpClients: Map<string, ActiveMcpClient>
}

export interface EstablishMcpConnectionResult {
  success: boolean
  error?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: { client: { tools: Record<any, any> } }
}

export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>

export type ConfigGetOutput = RouterOutputs["config"]["get"]
export type ImageGenerationInput = RouterInputs["image"]["generate"]
