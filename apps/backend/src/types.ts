import { MCPClient } from "./mcp-client.js"
import type { AppRouter } from "./trpc/router.js"
import type { MCPServer } from "@dojo/db/convex/types.js"
import type { inferRouterOutputs, inferRouterInputs } from "@trpc/server"
import { Request } from "express"

export interface GenerateImageOptions {
  n?: number
  size?: string
  quality?: string
  style?: string
}

export interface ActiveMcpClient {
  client: MCPClient
  server: MCPServer
}

export interface RequestWithUserContext extends Request {
  userId: string
  userSession: UserSession
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

export type ImageGenerationInput = RouterInputs["image"]["generate"]
