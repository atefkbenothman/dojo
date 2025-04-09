import * as path from "path"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import {
  CoreMessage,
  extractReasoningMiddleware,
  generateText,
  LanguageModel,
  Tool,
  ToolSet,
  wrapLanguageModel,
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
  private model: LanguageModel | null = null

  constructor(composeFilePath: string = path.resolve(process.cwd(), "..")) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing")
    }
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is missing")
    }
    this.composeFilePath = composeFilePath
    this.command = "docker-compose"
    this.args = ["run", "--rm", "github-mcp-server"]
    this.initializeAI(GOOGLE_API_KEY, GROQ_API_KEY)
    console.log(`Client SDK configured to run: ${this.command} ${this.args.join(" ")} in ${this.composeFilePath}`);
  }

  private initializeAI(googleApiKey: string, groqApiKey?: string) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: googleApiKey })
      this.model = wrapLanguageModel({
        model: google("gemini-1.5-flash"),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      })
      // const groq = createGroq({ apiKey: groqApiKey })
      // this.model = wrapLanguageModel({
      //   model: groq("llama-3.3-70b-versatile"),
      //   middleware: extractReasoningMiddleware({ tagName: "think" }),
      // })
      if (this.model) {
         console.log(`Initialized AI: [${this.model.provider}] [${this.model.modelId}]`)
      } else {
          throw new Error("Failed to initialize any AI model")
      }
    } catch (err) {
      console.error("Could not initialize AI model:", err)
      throw err
    }
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
    if (!this.model) {
      console.warn("AI model not initialized")
      return "Error: AI model not available."
    }

    if (!this.client) {
      console.warn("Client not connected")
      return "Error: MCP Client not connected."
    }

    if (!messages || messages.length === 0) {
      return "Error: cannot process empty message history"
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

  public async cleanup() {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.transport = null
      console.log("MCPClient connection closed")
    }
  }
}
