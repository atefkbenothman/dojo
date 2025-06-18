import { TransportFactory } from "./transport-factory"
import { logger } from "../../lib/logger"
import type { MCPServer } from "@dojo/db/convex/types"
import { asyncTryCatch } from "@dojo/utils"
import { Tool, experimental_createMCPClient } from "ai"

export class MCPClient {
  private server: MCPServer
  private sessionId: string
  private client: Awaited<ReturnType<typeof experimental_createMCPClient>> | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public tools: { [k: string]: Tool<any, any> } = {}

  constructor(server: MCPServer, sessionId: string) {
    this.server = server
    this.sessionId = sessionId
    logger.debug("MCP", `MCPClient configured for server ${this.server._id} (${this.server.name})`)
  }

  public async start(): Promise<void> {
    if (this.client) return

    if (!this.server.config) throw new Error(`No config found for MCP server ${this.server._id}`)
    logger.info("MCP", `Preparing transport for server ${this.server._id} (${this.server.name})...`)

    // Use TransportFactory to create the appropriate transport
    const transport = TransportFactory.createTransport(this.server, this.sessionId)

    const { data: client, error: clientError } = await asyncTryCatch(
      experimental_createMCPClient({
        transport,
        name: `dojo-${this.server.name}`,
      }),
    )

    if (!client || clientError) {
      logger.error("MCP", `Failed to create MCP client for server ${this.server._id}`, clientError)
      this.client = null
      this.tools = {}
      throw new Error(
        `Failed to create MCP client for server ${this.server._id}: ${clientError?.message || "Unknown error"}`,
      )
    }

    this.client = client
    logger.info("MCP", `MCP Client created successfully for server ${this.server._id}`)

    const { data: tools, error: toolsError } = await asyncTryCatch(this.client.tools())

    if (!tools || toolsError) {
      logger.error("MCP", `Failed to fetch MCP tools for server ${this.server._id}`, toolsError)
      this.tools = {}
      return
    }

    this.tools = tools
    logger.info("MCP", `Fetched ${Object.keys(this.tools).length} tools for server ${this.server._id}`)
  }

  public async cleanup(): Promise<void> {
    if (this.client) {
      logger.info("MCP", `Closing MCP client for server ${this.server._id}...`)
      await this.client.close()
      this.client = null
      this.tools = {}
      logger.info("MCP", `MCP client closed for server ${this.server._id}`)
    }
  }
}
