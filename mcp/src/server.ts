import * as path from "path"
import dotenv from "dotenv"

dotenv.config({
  path: path.resolve(__dirname, "..", ".env"),
})

import cors from "cors"
import express, { Express, Request, Response } from "express"
import { MCPClient } from "./client"
import { AVAILABLE_MCP_SERVERS, AVAILABLE_AI_MODELS } from "./config"
import { asyncTryCatch, tryCatch } from "./utils"
import type { CoreMessage } from "ai"
import type { ActiveConnection } from "./types"

const PORT = process.env.PORT || 8888
const DEFAULT_MODEL_ID = "gemini-1.5-flash"

const MAX_CONNECTIONS = 10
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const app: Express = express()

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  }),
)

app.use(express.json())

console.log("[server]: Available MCP Servers:", Object.keys(AVAILABLE_MCP_SERVERS).join(", "))
console.log("[server]: Available AI Models:", Object.keys(AVAILABLE_AI_MODELS).join(", "))

const activeConnections = new Map<string, ActiveConnection>()

/* Start the server */
app.listen(PORT, () => {
  console.log(`[server]: MCP Service listening on port ${PORT}`)
  console.log(`[server]: Initializing with ${activeConnections.size} connections.`)
  console.log(`[server]: Idle timeout set to ${IDLE_TIMEOUT_MS / 60000} minutes.`)
})

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
})

/* Get server health */
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" })
})

/* List servers */
app.get("/servers", (req: Request, res: Response) => {
  res.status(200).json({ servers: AVAILABLE_MCP_SERVERS })
})

const validateReqBody = (sessionId: any, config: any): boolean => {
  if (!sessionId || typeof sessionId !== "string") return false
  if (!config || typeof config !== "object") return false
  return true
}

const validateConnection = (sessionId: string): boolean => {
  if (activeConnections.has(sessionId)) {
    console.log(`[server]: Session ${sessionId} is already connected`)
    return false
  }

  if (activeConnections.size >= MAX_CONNECTIONS) {
    console.warn(`[server]: Connection limit ${MAX_CONNECTIONS} reached. Rejecting ${sessionId}`)
    return false
  }

  return true
}

const findConnection = (sessionId: string): ActiveConnection | null => {
  return activeConnections.get(sessionId) || null
}

const cleanupExistingConnection = async (sessionId: string): Promise<void> => {
  const existingConnection = findConnection(sessionId)

  if (existingConnection) {
    const { error } = await asyncTryCatch(existingConnection.client.cleanup())
    if (error) {
      console.error(`[server /connect]: Error cleaning up old client for session ${sessionId}:`, error)
    }
    activeConnections.delete(sessionId)
  }
}

/* Connect */
app.post("/connect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, config } = req.body

  if (!validateReqBody(sessionId, config)) {
    res.status(400).json({ message: "Missing or invalid sessionId or config" })
    return
  }

  console.log(`[server]: /connect request received for sessionId: ${sessionId}`)

  if (!validateConnection(sessionId)) {
    res.status(503).json({ message: "Service busy, connection limit reached" })
    return
  }

  await cleanupExistingConnection(sessionId)

  // Create mcp client
  const { data: mcpClient, error: mcpClientError } = tryCatch(new MCPClient(config))

  if (!mcpClient || mcpClientError) {
    console.error(`[server]: Error establising connection for ${sessionId}:`, mcpClientError)
    activeConnections.delete(sessionId)
    res.status(500).json({ message: "Failed to establish connection" })
    return
  }

  console.log(`[server]: Starting MCPClient connection for ${sessionId}...`)

  // Start mcp server
  const { error: mcpStartError } = await asyncTryCatch(mcpClient.start())

  if (mcpStartError) {
    console.error(`[server]: Error starting MCPClient for ${sessionId}`)
    activeConnections.delete(sessionId)
    res.status(500).json({ message: "Failed to start MCPClient" })
    return
  }

  const connectionData: ActiveConnection = {
    client: mcpClient,
    lastActivityTimestamp: Date.now(),
  }
  activeConnections.set(sessionId, connectionData)

  console.log(`[server]: Connection established for ${sessionId}. Total connections: ${activeConnections.size}`)
  res.status(200).json({ message: "Connection successful" })
})

/* Disconnect */
app.post("/disconnect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.body

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ message: "Missing or invalid sessionId" })
    return
  }

  console.log(`[server]: /disconnect request received for sessionId: ${sessionId}`)

  await cleanupExistingConnection(sessionId)

  console.log(`[server]: Connection closed for ${sessionId}. Total connections: ${activeConnections.size}`)
  res.status(200).json({ message: "Disconnection successful" })
})

const validateChatRequest = (messages: any, modelId: string): { isValid: boolean; error?: string } => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: "Missing or invalid messages array" }
  }

  const model = modelId || DEFAULT_MODEL_ID
  const aiModel = AVAILABLE_AI_MODELS[model]?.languageModel

  if (!aiModel) {
    return { isValid: false, error: "AI Model not configured on backend" }
  }

  return { isValid: true }
}

const handleDirectChat = async (aiModel: any, messages: CoreMessage[], res: Response): Promise<void> => {
  const { data: directChatResponse, error } = await asyncTryCatch(MCPClient.directChat(aiModel, messages))

  if (error || !directChatResponse) {
    console.error(`[server /chat - Direct]: Error during direct AI call:`, error)
    res.status(500).json({ message: `Error processing direct chat: ${error}` })
    return
  }

  directChatResponse.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  res.status(directChatResponse.status)

  if (directChatResponse.body) {
    for await (const chunk of directChatResponse.body) {
      res.write(chunk)
    }
  }
  res.end()
}

const formatStreamPart = (part: any): { prefix: string; contentJson: string } => {
  let prefix = ""
  let contentJson = ""

  switch (part.type) {
    case "text-delta":
      prefix = "0"
      contentJson = JSON.stringify(part.textDelta)
      break
    case "tool-call":
      prefix = "9"
      contentJson = JSON.stringify({
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.args,
      })
      break
    case "tool-result":
      prefix = "a"
      contentJson = JSON.stringify({
        toolCallId: part.toolCallId,
        result: part.result,
      })
      break
    case "finish":
      prefix = "d"
      contentJson = JSON.stringify({
        finishReason: "finished",
        usage: part.usage,
      })
      break
    case "error":
      prefix = "3"
      contentJson = JSON.stringify(part.error)
      break
  }

  return { prefix, contentJson }
}

const handleStreamedChat = async (
  connectionData: ActiveConnection,
  aiModel: any,
  messages: CoreMessage[],
  res: Response,
): Promise<void> => {
  const { data: stream, error } = await asyncTryCatch(connectionData.client.chat(aiModel, messages))

  if (error || !stream) {
    console.error(`[server]: Error during chat:`, error)
    res.status(400).json({ message: "Error processing chat message" })
    return
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8")
  res.setHeader("Transfer-Encoding", "chunked")
  res.setHeader("X-Vercel-AI-Data-Stream", "v1")
  res.status(200)

  for await (const part of stream) {
    const { prefix, contentJson } = formatStreamPart(part)
    if (prefix && contentJson) {
      res.write(`${prefix}:${contentJson}\n`)
    }
  }
  res.end()
}

/* Chat Stream */
app.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, messages, modelId } = req.body
  const model = modelId || DEFAULT_MODEL_ID

  console.log(`[server]: /chat request received for sessionId: ${sessionId} using model: ${model}`)

  const validation = validateChatRequest(messages, model)

  if (!validation.isValid) {
    res.status(validation.error?.includes("configured") ? 500 : 400).json({ message: validation.error })
    return
  }

  const aiModel = AVAILABLE_AI_MODELS[model].languageModel
  const connectionData = activeConnections.get(sessionId)

  if (!connectionData) {
    console.log(`[server /chat]: No active MCP connection found for sessionId: ${sessionId}. Using direct AI call.`)
    await handleDirectChat(aiModel, messages as CoreMessage[], res)
    return
  }

  connectionData.lastActivityTimestamp = Date.now()
  console.log(`[server]: Updated last activity time for ${sessionId}`)

  await handleStreamedChat(connectionData, aiModel, messages as CoreMessage[], res)
})
