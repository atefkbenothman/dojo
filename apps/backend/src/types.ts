import { MCPClient } from "./mcp-client.js"
import type { AppRouter } from "./trpc/router.js"
import type { MCPServer } from "@dojo/db/convex/types.js"
import type { inferRouterOutputs, inferRouterInputs } from "@trpc/server"

export interface GenerateImageOptions {
  n?: number
  size?: string
  quality?: string
  style?: string
}

/**
 * Represents a live, active MCPClient connection on the backend.
 * This is stored in the in-memory cache.
 */
export interface ActiveMcpClient {
  client: MCPClient
  server: MCPServer
}

export interface EstablishMcpConnectionResult {
  serverId: string
  success: boolean
  tools: Record<string, any>
}

export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>

export type ImageGenerationInput = RouterInputs["image"]["generate"]
