import * as path from "path"
import dotenv from "dotenv"

dotenv.config({
  path: path.resolve(__dirname, "..", ".env"),
})

import { asyncTryCatch } from "@dojo/shared-utils"
import { Tool, experimental_createMCPClient } from "ai"
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio"
import { MCPServerConfig } from "@/types"

export class MCPClient {
  private config: MCPServerConfig
  private client: Awaited<ReturnType<typeof experimental_createMCPClient>> | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public tools: { [k: string]: Tool<any, any> } = {}

  constructor(config: MCPServerConfig) {
    this.config = config
    console.log(`[MCP] MCPClient configured for service ${this.config.name}`)
  }

  private setupEnvironment(): Record<string, string> {
    const parentEnv = { ...process.env }
    const configEnv = this.config.env || {}

    return {
      ...parentEnv,
      ...configEnv,
      PATH: configEnv.PATH || parentEnv.PATH || "",
    }
  }

  private createTransport(envs: Record<string, string>): StdioMCPTransport {
    return new StdioMCPTransport({
      command: this.config.command,
      args: this.config.args,
      cwd: ".",
      env: envs,
    })
  }

  public async start(): Promise<void> {
    if (this.client) return

    console.log(`[MCP.start] Preparing environment and transport for ${this.config.name}...`)

    const envs = this.setupEnvironment()
    const transport = this.createTransport(envs)

    const { data: client, error: clientError } = await asyncTryCatch(experimental_createMCPClient({ transport }))

    if (!client || clientError) {
      console.error("[MCP.start] Failed to create MCP client: ", clientError)
      this.client = null
      this.tools = {}
      return
    }

    this.client = client
    console.log(`[MCP.start] MCP Client created successfully for ${this.config.name}`)

    const { data: tools, error: toolsError } = await asyncTryCatch(this.client.tools())

    if (!tools || toolsError) {
      console.error("[MCP.start] Failed to fetch MCP tools: ", clientError)
      this.tools = {}
      return
    }

    this.tools = tools
    console.log(`[MCP.getTools] Fetched ${Object.keys(this.tools).length} tools`)
  }

  public async cleanup(): Promise<void> {
    if (this.client) {
      console.log(`[MCP.cleanup] Closing MCP client...`)
      await this.client.close()
      this.client = null
      this.tools = {}
      console.log(`[MCP.cleanup] MCP client closed`)
    }
  }
}
