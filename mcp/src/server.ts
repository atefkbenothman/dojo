import * as path from "path"
import cors from "cors"
import dotenv from "dotenv"
import express, { Express, Request, Response } from "express"

import { MCPClient } from "./client"
import { AVAILABLE_MCP_SERVERS, AVAILABLE_AI_MODELS } from "./config"
import { asyncTryCatch, tryCatch } from "./utils"
import type { CoreMessage } from "ai"
import type { ActiveConnection } from "./types"

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
})

const DEFAULT_MODEL_ID = "gemini-1.5-flash"

console.log(
  "[server]: Available MCP Servers:",
  Object.values(AVAILABLE_MCP_SERVERS).join(", "),
)
console.log(
  "[server]: Available AI Models:",
  Object.keys(AVAILABLE_AI_MODELS).join(", "),
)

// In-memory map to hold active connections, keyed by sessionId
const activeConnections = new Map<string, ActiveConnection>()

const MAX_CONNECTIONS = 10
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const app: Express = express()
const port = process.env.PORT || 8888

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  }),
)

app.use(express.json())

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" })
})

/* Servers */
app.get("/servers", (req: Request, res: Response) => {
  res.status(200).json({ servers: AVAILABLE_MCP_SERVERS })
})

/* Connect */
app.post("/connect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, config } = req.body

  if (!sessionId || typeof sessionId !== "string") {
    console.warn("[server]: /connect called without a valid sessionId")
    res.status(400).json({
      message: "Missing or invalid sessionId",
    })
    return
  }

  if (!config || typeof config !== "object") {
    res.status(400).json({
      message: "Missing or invalid config",
    })
    return
  }

  console.log(`[server]: /connect request received for sessionId: ${sessionId}`)

  // Check if connection already exists
  if (activeConnections.has(sessionId)) {
    console.log(`[server]: Session ${sessionId} is already connected`)
    res.status(200).json({
      message: "Already connected",
    })
    return
  }

  // Check connection limit
  if (activeConnections.size >= MAX_CONNECTIONS) {
    console.warn(
      `[server]: Connection limit ${MAX_CONNECTIONS} reached. Rejecting ${sessionId}`,
    )
    res.status(503).json({
      message: "Service busy, connection limit reached",
    })
    return
  }

  // Handle existing connection
  const existingConnection = activeConnections.get(sessionId)

  if (existingConnection) {
    const { error } = await asyncTryCatch(existingConnection.client.cleanup())
    if (error) {
      console.error(
        `[server /connect]: Error cleaning up old client for session ${sessionId}:`,
        error,
      )
    }
    activeConnections.delete(sessionId)
  }

  const { data: mcpClient, error: mcpClientError } = tryCatch(
    new MCPClient(config),
  )

  if (!mcpClient || mcpClientError) {
    console.error(
      `[server]: Error establising connection for ${sessionId}:`,
      mcpClientError,
    )
    activeConnections.delete(sessionId)
    res.status(500).json({ message: "Failed to establish connection" })
    return
  }

  console.log(`[server]: Starting MCPClient connection for ${sessionId}...`)

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

  // Store the new connection
  activeConnections.set(sessionId, connectionData)

  console.log(
    `[server]: Connection established for ${sessionId}. Total connections: ${activeConnections.size}`,
  )
  res.status(200).json({ message: "Connection successful" })
})

/* Disconnect */
app.post("/disconnect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.body

  if (!sessionId || typeof sessionId !== "string") {
    console.warn("[server]: /disconnect called without a valid sessionId")
    res.status(400).json({ message: "Missing or invalid sessionId" })
    return
  }

  console.log(
    `[server]: /disconnect request received for sessionId: ${sessionId}`,
  )

  const connectionData = activeConnections.get(sessionId)

  if (!connectionData) {
    console.log(`[server]: Session ${sessionId} not found for disconnection`)
    res
      .status(200)
      .json({ message: "Session not found or already disconnected" })
    return
  }

  const { error } = await asyncTryCatch(connectionData.client.cleanup())

  if (error) {
    console.error(
      `[server]: Error during disconnection for ${sessionId}:`,
      error,
    )
    res.status(500).json({ message: "Error during disconnection cleanup" })
    return
  }

  activeConnections.delete(sessionId)

  console.log(
    `[server]: Connection closed for ${sessionId}. Total connections: ${activeConnections.size}`,
  )
  res.status(200).json({ message: "Disconnection successful" })
})

/* Chat Stream */
app.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, messages, modelId } = req.body

  const model = modelId || DEFAULT_MODEL_ID
  const aiModel = AVAILABLE_AI_MODELS[model].languageModel

  if (!aiModel) {
    console.error(
      `[server /chat - Direct]: Cannot process direct chat, AI model not initialized.`,
    )
    res.status(500).json({ message: "AI Model not configured on backend." })
    return
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.warn(
      `[server]: /chat called for ${sessionId} without a valid message array`,
    )
    res.status(400).json({ message: "Missing or invalid messages array" })
    return
  }

  console.log(
    `[server]: /chat request received for sessionId: ${sessionId} using model: ${model}`,
  )

  const connectionData = activeConnections.get(sessionId)

  if (!connectionData) {
    console.log(
      `[server /chat]: No active MCP connection found for sessionId: ${sessionId}. Using direct AI call.`,
    )

    const { data: directChatResponse, error } = await asyncTryCatch(
      MCPClient.directChat(aiModel, messages),
    )

    if (error || !directChatResponse) {
      console.error(
        `[server /chat - Direct]: Error during direct AI call:`,
        error,
      )
      res
        .status(500)
        .json({ message: `Error processing direct chat: ${error}` })
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
      res.end()
    } else {
      res.end()
    }

    return
  }

  connectionData.lastActivityTimestamp = Date.now()
  console.log(`[server]: Updated last activity time for ${sessionId}`)

  const { data: stream, error } = await asyncTryCatch(
    connectionData.client.chat(aiModel, messages as CoreMessage[]),
  )

  if (error || !stream) {
    console.error(`[server]: Error during chat for ${sessionId}:`, error)
    res.status(400).json({ message: "Error processing chat message" })
    return
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8")
  res.status(200)

  for await (const chunk of stream) {
    res.write(chunk)
  }
  res.end()
})

/* Start the server */
app.listen(port, () => {
  console.log(`[server]: MCP Service listening on port ${port}`)
  console.log(
    `[server]: Initializing with ${activeConnections.size} connections.`,
  )
  console.log(
    `[server]: Idle timeout set to ${IDLE_TIMEOUT_MS / 60000} minutes.`,
  )
})

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
})
