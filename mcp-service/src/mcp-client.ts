import * as path from "path"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import {
  CoreMessage,
  generateText,
  LanguageModel,
  Tool,
  ToolSet,
  jsonSchema
} from "ai"
import dotenv from "dotenv"

dotenv.config({
  path: path.resolve(process.cwd(), "../.env")
})

export class MCPClient {
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private composeFilePath: string
  private command: string
  private args: string[]
  private tools: ToolSet | undefined = undefined
  private model: LanguageModel
  private dockerComposeService: string

  constructor(model: LanguageModel, dockerComposeService: string, composeFilePath: string = path.resolve(process.cwd(), "..")) {
    this.model = model
    this.composeFilePath = composeFilePath
    this.dockerComposeService = dockerComposeService
    this.command = "docker-compose"
    this.args = ["run", "--rm", dockerComposeService]
    console.log(`MCPClient configured for model ${this.model.modelId} and service ${this.dockerComposeService}`)
  }

  public async start(): Promise<void> {
    if (this.client) {
      console.warn("Client already started")
      return
    }

    this.client = new Client({
      name: "mcp-client",
      version: "1.0.0"
    })

    this.transport = new StdioClientTransport({
      command: this.command,
      args: this.args,
      cwd: this.composeFilePath
    })

    try {
      console.log("Connecting client and initiating handshake...")

      await this.client.connect(this.transport)

      const toolsResults = await this.client.listTools()

      this.tools = toolsResults.tools.reduce((acc, tool) => {
        acc[tool.name] = {
          description: tool.description,
          parameters: jsonSchema(tool.inputSchema)
        } as Tool
        return acc
      }, {} as ToolSet)

      console.log("Connected to server with tools: ", Object.values(this.tools).map(tool => tool.description))
    } catch (err) {
      console.error("Failed to connect MCP client: ", err)
      this.client = null
      this.transport = null
      throw err
    }
  }

  public async chat(messages: CoreMessage[]): Promise<string | undefined> {
    if (!this.client) {
      console.warn("Client not connected")
      return "Error: MCP Client not connected."
    }

    console.log(`Generating AI response based on ${messages.length} messages. Last message:`, messages[messages.length-1]?.content)

    try {
      let response = await generateText({
          model: this.model,
          messages: messages,
          tools: this.tools,
      })

      let finalText = []
      let toolResults = []

      for (const message of response.response.messages) {
        for (const content of message.content) {
          if (typeof content === "object") {
            if (content.type === "text" || content.type === "reasoning") {
              finalText.push(content.text)
            } else if (content.type === "tool-call") {
              console.log("CALLING TOOL: ", content)

              const toolName = content.toolName
              const toolArgs = content.args as { [x: string]: unknown } | undefined

              const result = await this.client.callTool({
                name: toolName,
                arguments: toolArgs
              })

              toolResults.push(result)
              finalText.push(`[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`)

              messages.push({
                role: "user",
                content: result.content as string
              })

              const response = await generateText({
                model: this.model,
                messages: messages,
              })

              finalText.push(response.text)

            }
          }
        }
      }

      return finalText.join("\n")
    } catch (err) {
      console.error("Error generating text or calling tool:", err)
      return `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }

  static async directChat(model: LanguageModel, messages: CoreMessage[]): Promise<string | undefined> {
    console.log(`MCPClient.directChat (static): Using direct AI call for ${messages.length} messages`)

    if (!model) {
      console.error("MCPClient.directChat called without a valid model")
      return "Error: AI Model not provided for direct chat"
    }

    if (!messages || messages.length === 0) {
        console.warn("MCPClient.directChat called with empty messages")
        return "Error: Cannot process empty message history"
    }

    try {
      const result = await generateText({
        model: model,
        messages: messages
      })

      return result.text
    } catch (err) {
      console.error(`MCPClient.directChat: Error during direct AI call:`, err)
      return `Error during direct chat: ${err}`
    }
  }

  public async cleanup() {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.transport = null
      console.log("MCPClient connection closed")
    }
  }
}
