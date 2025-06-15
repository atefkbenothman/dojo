import type { MCPServer } from "@dojo/db/convex/types"
import { asyncTryCatch } from "@dojo/utils"
import { Tool, experimental_createMCPClient } from "ai"
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio"

export class MCPClient {
  private server: MCPServer
  private client: Awaited<ReturnType<typeof experimental_createMCPClient>> | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public tools: { [k: string]: Tool<any, any> } = {}

  constructor(server: MCPServer) {
    this.server = server
    console.log(`[MCP] MCPClient configured for server ${this.server._id} (${this.server.name})`)
  }

  // change this to use the server config env
  private setupEnvironment(): Record<string, string> {
    const parentEnv = { ...process.env }
    const configEnv = this.server.config?.env || {}

    return {
      ...parentEnv,
      ...configEnv,
      PATH: configEnv.PATH || parentEnv.PATH || "",
    }
  }

  private createTransport(envs: Record<string, string>): StdioMCPTransport {
    if (!this.server.config) throw new Error(`No config found for MCP server ${this.server._id}`)
    return new StdioMCPTransport({
      command: this.server.config.command,
      args: this.server.config.args,
      cwd: ".",
      env: envs,
    })
  }

  public async start(): Promise<void> {
    if (this.client) return

    if (!this.server.config) throw new Error(`No config found for MCP server ${this.server._id}`)
    console.log(
      `[MCP.start] Preparing environment and transport for server ${this.server._id} (${this.server.name})...`,
    )

    const envs = this.setupEnvironment()
    const transport = this.createTransport(envs)

    const { data: client, error: clientError } = await asyncTryCatch(experimental_createMCPClient({ transport }))

    if (!client || clientError) {
      console.error(`[MCP.start] Failed to create MCP client for server ${this.server._id}: `, clientError)
      this.client = null
      this.tools = {}
      throw new Error(
        `Failed to create MCP client for server ${this.server._id}: ${clientError?.message || "Unknown error"}`,
      )
    }

    this.client = client
    console.log(`[MCP.start] MCP Client created successfully for server ${this.server._id}`)

    const { data: tools, error: toolsError } = await asyncTryCatch(this.client.tools())

    if (!tools || toolsError) {
      console.error(`[MCP.start] Failed to fetch MCP tools for server ${this.server._id}: `, toolsError)
      this.tools = {}
      return
    }

    this.tools = tools
    console.log(`[MCP.getTools] Fetched ${Object.keys(this.tools).length} tools for server ${this.server._id}`)
  }

  public async cleanup(): Promise<void> {
    if (this.client) {
      console.log(`[MCP.cleanup] Closing MCP client for server ${this.server._id}...`)
      await this.client.close()
      this.client = null
      this.tools = {}
      console.log(`[MCP.cleanup] MCP client closed for server ${this.server._id}`)
    }
  }
}
