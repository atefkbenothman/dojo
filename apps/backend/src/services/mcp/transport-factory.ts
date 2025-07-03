import type { MCPServer } from "@dojo/db/convex/types"
import { ALLOWED_STDIO_COMMANDS } from "@dojo/db/convex/types"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import type { MCPTransport } from "ai"
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio"

// Transport configurations that AI SDK understands
type StdioTransportConfig = InstanceType<typeof StdioMCPTransport>
type SseTransportConfig = { type: "sse"; url: string; headers?: Record<string, string> }

// Use AI SDK's transport types - stdio transport, SSE config, or custom HTTP transport
export type TransportConfig = MCPTransport | SseTransportConfig | StreamableHTTPClientTransport

// Type for future schema with transportType
type StdioServerConfig = {
  transportType: "stdio"
  config: {
    type: "stdio"
    command: string
    args: string[]
    requiresEnv?: string[]
    env?: Record<string, string>
  }
}

type HttpServerConfig = {
  transportType: "http"
  config: {
    type: "http"
    url: string
    headers?: Record<string, string>
  }
}

type SseServerConfig = {
  transportType: "sse"
  config: {
    type: "sse"
    url: string
    headers?: Record<string, string>
  }
}

type MCPServerWithTransport = Omit<MCPServer, "config"> & (StdioServerConfig | HttpServerConfig | SseServerConfig)

export class TransportFactory {
  static createTransport(server: MCPServer, sessionId: string): TransportConfig {
    // For now, all existing servers are stdio (until we update the schema)
    // Check if server has transportType (future schema)
    if ("transportType" in server) {
      const serverWithTransport = server as unknown as MCPServerWithTransport

      switch (serverWithTransport.transportType) {
        case "stdio":
          return TransportFactory.createStdioTransportFromNew(serverWithTransport)
        case "http":
          return TransportFactory.createHttpTransport(serverWithTransport, sessionId)
        case "sse":
          return TransportFactory.createSseTransport(serverWithTransport)
        default:
          // @ts-expect-error - exhaustive check
          throw new Error(`Unknown transport type: ${serverWithTransport.transportType}`)
      }
    }

    // Current schema - all servers are stdio
    return TransportFactory.createStdioTransport(server)
  }

  private static createStdioTransport(server: MCPServer): StdioTransportConfig {
    if (!server.config) {
      throw new Error(`No config found for server ${server._id}`)
    }

    if (server.config.type !== "stdio") {
      throw new Error(`Expected stdio config but got ${server.config.type} for server ${server._id}`)
    }

    // Validate command is allowed
    if (!ALLOWED_STDIO_COMMANDS.includes(server.config.command as any)) {
      throw new Error(`Invalid command. Only npx and uvx commands are allowed for stdio MCP servers`)
    }

    const envs: Record<string, string> = {}

    // Copy process.env, filtering out undefined values
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        envs[key] = value
      }
    }

    // Override with server-specific env vars
    if (server.config.env) {
      Object.assign(envs, server.config.env)
    }

    return new StdioMCPTransport({
      command: server.config.command,
      args: server.config.args,
      cwd: ".",
      env: envs,
    })
  }

  private static createStdioTransportFromNew(
    server: Extract<MCPServerWithTransport, { transportType: "stdio" }>,
  ): StdioTransportConfig {
    // Validate command is allowed
    if (!ALLOWED_STDIO_COMMANDS.includes(server.config.command as any)) {
      throw new Error(`Invalid command. Only npx and uvx commands are allowed for stdio MCP servers`)
    }

    const envs: Record<string, string> = {}

    // Copy process.env, filtering out undefined values
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        envs[key] = value
      }
    }

    // Override with server-specific env vars
    if (server.config.env) {
      Object.assign(envs, server.config.env)
    }

    return new StdioMCPTransport({
      command: server.config.command,
      args: server.config.args,
      cwd: ".",
      env: envs,
    })
  }

  private static createHttpTransport(
    server: Extract<MCPServerWithTransport, { transportType: "http" }>,
    sessionId: string,
  ): StreamableHTTPClientTransport {
    // Create URL object for the HTTP transport
    const url = new URL(server.config.url)

    // Create StreamableHTTPClientTransport with sessionId and headers in requestInit
    return new StreamableHTTPClientTransport(url, {
      sessionId: sessionId,
      requestInit: {
        headers: server.config.headers,
      },
    })
  }

  private static createSseTransport(
    server: Extract<MCPServerWithTransport, { transportType: "sse" }>,
  ): SseTransportConfig {
    // For SSE transport, we return a config object that AI SDK understands
    return {
      type: "sse" as const,
      url: server.config.url,
      headers: server.config.headers,
    }
  }
}
