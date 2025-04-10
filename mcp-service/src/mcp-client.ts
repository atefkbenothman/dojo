import * as path from "path"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import {
  CoreMessage,
  generateText,
  LanguageModel,
  Tool,
  ToolSet,
  jsonSchema,
  GenerateTextResult
} from "ai"
import dotenv from "dotenv"
import { asyncTryCatch } from "./utils"
import { MCPServerConfig } from "./types"

dotenv.config({
  path: path.resolve(process.cwd(), "../.env")
})

async function generateModelResponse(model: LanguageModel, messages: CoreMessage[], tools?: ToolSet): Promise<GenerateTextResult<ToolSet, never> | null | undefined> {
  const { data: response, error } = await asyncTryCatch(generateText({
    model: model,
    messages: messages,
    tools: tools ?? {}
  }))

  if (error || !response) {
    console.error("[MCPClient] Error generating text:", error)
    return
  }

  return response
}

export class MCPClient {
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private mcpServerConfig: MCPServerConfig | null = null
  private tools: ToolSet | undefined = undefined
  private model: LanguageModel

  constructor(model: LanguageModel, serverConfig: MCPServerConfig) {
    this.model = model
    this.mcpServerConfig = serverConfig
    console.log(`[MCPClient] MCPClient configured for model ${this.model.modelId} and service ${this.mcpServerConfig.displayName}`)
  }

  public async start(): Promise<void> {
    if (this.client || !this.mcpServerConfig) return

    this.client = new Client({
      name: "mcp-client",
      version: "1.0.0"
    })

    this.transport = new StdioClientTransport({
      command: this.mcpServerConfig.command,
      args: this.mcpServerConfig.args,
      cwd: this.mcpServerConfig.cwd,
    })

    const { error: connectError } = await asyncTryCatch(this.client.connect(this.transport))

    if (connectError) {
      console.error("[MCPClient] Failed to connect MCP client: ", connectError)
      this.client = null
      this.transport = null
      throw connectError
    }

    const { data: allTools, error: allToolsError } = await asyncTryCatch(this.client.listTools())

    if (allToolsError || !allTools) {
      console.error("[MCPClient] Failed to fetch tools from MCP server:", allToolsError)
      this.tools = {} as ToolSet
      return
    }

    this.tools = allTools.tools.reduce((acc, tool) => {
      acc[tool.name] = {
        description: tool.description,
        parameters: jsonSchema(tool.inputSchema)
      } as Tool
      return acc
    }, {} as ToolSet)

    console.log("[MCPClient] Connected to server with tools: ", Object.values(this.tools).map(tool => tool.description))
  }

  public async chat(messages: CoreMessage[]): Promise<string> {
    if (!this.client) return "Error: MCP Client not connected"

    console.log(`[MCPClient] Generating AI response based on ${messages.length} messages. Last message:`, messages[messages.length-1]?.content)

    const response = await generateModelResponse(this.model, messages, this.tools)

    if (!response) return "Error generating response from AI"

    let finalText = []
    let toolResults = []

    for (const message of response.response.messages) {
      for (const content of message.content) {
        if (typeof content === "object") {
          if (content.type === "text" || content.type === "reasoning") {
            finalText.push(content.text)
          } else if (content.type === "tool-call") {
            console.log("[MCPClient] Calling Tool:", content)
            const toolResult = await this.client.callTool({
              name: content.toolName,
              args: content.args
            })
            toolResults.push(toolResult)
            finalText.push(`[Calling tool ${content.toolName} with args ${JSON.stringify(content.args)}]`)
            messages.push({
              role: "user",
              content: toolResult.content as string
            })
            const finalResponse = await generateModelResponse(this.model, messages)
            if (finalResponse) {
              finalText.push(finalResponse.text)
            }
          }
        }
      }
    }

    return finalText.join("\n\n")
  }

  static async directChat(model: LanguageModel, messages: CoreMessage[]): Promise<string> {
    console.log(`[MCPClient] MCPClient.directChat (static): Using direct AI call for ${messages.length} messages`)

    if (!messages || messages.length === 0) {
      return "Error: Cannot process empty message history"
    }

    const response = await generateModelResponse(model, messages)

    if (!response) return "Error generating response from AI"

    return response.text
  }

  public async cleanup() {
    if (this.client) {
      console.log("[MCPClient] Cleaning up and closing MCPClient")
      await this.client.close()
      this.client = null
      this.transport = null
    }
  }
}
