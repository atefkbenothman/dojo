import * as path from "path"
import dotenv from "dotenv"

dotenv.config({
  path: path.resolve(__dirname, "..", ".env"),
})

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { CoreMessage, streamText, LanguageModel, Tool, ToolSet, jsonSchema, ToolCallPart, ToolResultPart } from "ai"
import { asyncTryCatch } from "./utils"
import { ChatStreamPart, MCPServerConfig } from "./types"
import { SYSTEM_PROMPT } from "./config"

export class MCPClient {
  private config: MCPServerConfig
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private tools: ToolSet | undefined = undefined

  constructor(serverConfig: MCPServerConfig) {
    this.config = serverConfig
    console.log(`[MCPClient] MCPClient configured for service ${this.config.displayName}`)
  }

  private initializeClient(): void {
    if (this.client) return

    this.client = new Client({
      name: "mcp-client",
      version: "1.0.0",
    })
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

  private setupTransport(envs: Record<string, string>): void {
    if (!this.config.command) {
      throw new Error("[MCPClient] Command is required to setup transport")
    }

    if (!Array.isArray(this.config.args)) {
      throw new Error("[MCPClient] Args must be an array")
    }

    this.transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args,
      cwd: ".",
      env: envs,
    })
  }

  private async fetchAndConvertTools(): Promise<void> {
    const { data: allTools, error: allToolsError } = await asyncTryCatch(this.client!.listTools())

    if (allToolsError || !allTools) {
      console.error("[MCPClient] Failed to fetch tools from MCP server:", allToolsError)
      this.tools = {} as ToolSet
      return
    }

    this.tools = allTools.tools.reduce((acc, tool) => {
      acc[tool.name] = {
        description: tool.description,
        parameters: jsonSchema(tool.inputSchema),
      } as Tool
      return acc
    }, {} as ToolSet)

    console.log("[MCPClient] Connected to server with tools:", Object.keys(this.tools).join(", "))
  }

  private updateMessageHistory(
    currentMessages: CoreMessage[],
    assistantContent: Array<{ type: "text"; text: string } | ToolCallPart>,
    toolResults: ToolResultPart[],
  ): CoreMessage[] {
    const updatedMessages = [...currentMessages]

    if (assistantContent.length > 0) {
      updatedMessages.push({
        role: "assistant",
        content: assistantContent,
      })
    }

    if (toolResults.length > 0) {
      updatedMessages.push({ role: "tool", content: toolResults })
    }

    return updatedMessages
  }

  private async processToolCall(toolCall: ToolCallPart): Promise<ToolResultPart> {
    let resultData: unknown = null
    let isResultError = false

    const { data, error } = await asyncTryCatch(
      this.client!.callTool({
        name: toolCall.toolName,
        arguments: toolCall.args as { [x: string]: unknown } | undefined,
      }),
    )

    if (error || !data) {
      resultData = `Error: ${error}`
      isResultError = true
    } else {
      resultData = data.content
    }

    return {
      type: "tool-result",
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.toolName,
      result: resultData,
      isError: isResultError,
    }
  }

  private async processAIResponse(
    model: LanguageModel,
    messages: CoreMessage[],
    tools: ToolSet,
    controller: ReadableStreamDefaultController<ChatStreamPart>,
  ): Promise<{
    aiResponseText: string
    pendingToolCalls: ToolCallPart[]
    hasToolCalls: boolean
  }> {
    let aiResponseText = ""
    let pendingToolCalls: ToolCallPart[] = []
    let hasToolCalls = false

    const result = await streamText({
      model: model,
      system: SYSTEM_PROMPT,
      messages: messages,
      tools: tools,
    })

    for await (const part of result.fullStream) {
      controller.enqueue(part)
      switch (part.type) {
        case "text-delta":
          aiResponseText += part.textDelta
          break
        case "tool-call":
          hasToolCalls = true
          pendingToolCalls.push(part)
          break
      }
    }

    return {
      aiResponseText,
      pendingToolCalls,
      hasToolCalls,
    }
  }

  /* Start */
  public async start(): Promise<void> {
    if (this.client) return

    this.initializeClient()
    const envs = this.setupEnvironment()
    this.setupTransport(envs)

    const { error: connectError } = await asyncTryCatch(this.client!.connect(this.transport!))

    if (connectError) {
      console.error("[MCPClient] Failed to connect MCP client: ", connectError)
      this.client = null
      this.transport = null
      throw connectError
    }

    await this.fetchAndConvertTools()
  }

  /* Chat */
  public async chat(model: LanguageModel, messages: CoreMessage[]): Promise<ReadableStream<ChatStreamPart>> {
    if (!this.client) {
      return new ReadableStream({
        start(controller) {
          controller.error(new Error("Error: MCP Client not connected"))
          controller.close()
        },
      })
    }

    console.log(
      `[MCPClient] Generating AI response based on ${messages.length} messages. Last message:`,
      messages[messages.length - 1]?.content,
    )

    const mcpClient = this
    let messageHistory = [...messages]

    return new ReadableStream<ChatStreamPart>({
      async start(controller) {
        let loopCounter = 0

        while (true) {
          loopCounter += 1
          console.log(
            `[MCPClient.chat] Loop ${loopCounter}: Starting streamText call with ${messageHistory.length} messages.`,
          )

          try {
            // Process AI Response
            const tools = mcpClient.tools || {}
            const { aiResponseText, pendingToolCalls, hasToolCalls } = await mcpClient.processAIResponse(
              model,
              messageHistory,
              tools,
              controller,
            )

            // Build Assistant Response
            const assistantResponse: Array<{ type: "text"; text: string } | ToolCallPart> = []

            if (aiResponseText.trim()) {
              assistantResponse.push({
                type: "text",
                text: aiResponseText.trim(),
              })
            }
            assistantResponse.push(...pendingToolCalls)

            // Update Message History with Assistant Response
            messageHistory = mcpClient.updateMessageHistory(messageHistory, assistantResponse, [])

            // Check if we need to execute tools
            if (!hasToolCalls) {
              console.log(`[MCPClient.chat] No tool calls in this turn. Ending loop.`)
              break
            }

            // Execute Tools
            console.log(`[MCPClient.chat] Executing ${pendingToolCalls.length} tool(s)...`)

            const toolResults: ToolResultPart[] = []
            for (const toolCall of pendingToolCalls) {
              const result = await mcpClient.processToolCall(toolCall)
              controller.enqueue(result)
              toolResults.push(result)
            }

            // Update Message History with Tool Results
            messageHistory = mcpClient.updateMessageHistory(messageHistory, [], toolResults)
          } catch (err) {
            console.error(`[MCPClient.chat] Loop ${loopCounter}: Error during processing:`, err)
            controller.enqueue({
              type: "error",
              error: err,
            })
            controller.close()
            return
          }
        }

        console.log("[MCPClient.chat] Loop finished. Stream process complete.")
        controller.close()
      },
    })
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
