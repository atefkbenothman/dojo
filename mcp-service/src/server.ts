import * as path from "path"
import express, { Express, Request, Response } from "express"
import { CoreMessage, extractReasoningMiddleware, LanguageModel, wrapLanguageModel } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { MCPClient } from "./mcp-client"
import type { MCPServerConfig, ActiveConnection } from "./types"
import { asyncTryCatch, tryCatch } from "./utils"
import dotenv from "dotenv"

dotenv.config({
  path: path.resolve(process.cwd(), "../.env")
})

const PROJECT_ROOT_PATH = path.resolve(process.cwd(), "..")

const AVAILABLE_MCP_SERVERS: Record<string, MCPServerConfig> = {
  "github": {
    displayName: "Github",
    command: "docker-compose",
    args: ["run", "--rm", "github-mcp-server"],
    cwd: PROJECT_ROOT_PATH
  },
  "supabase": {
    displayName: "Supabase",
    command: "npx",
    args: [
      "-y",
      "@supabase/mcp-server-supabase@latest",
      "--access-token",
      process.env.SUPABASE_ACCESS_TOKEN || ""
    ],
  }
}

console.log("[server]: Available MCP Servers:", Object.keys(AVAILABLE_MCP_SERVERS).join(", "))

const { data: google, error } = tryCatch(createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY }))

if (error) {
  console.error("[server]: Failed to initialize central AI model:", error)
  throw error
}

const aiModel: LanguageModel = wrapLanguageModel({
  model: google("gemini-1.5-flash"),
  middleware: extractReasoningMiddleware({ tagName: "think" })
})

// In-memory map to hold active connections, keyed by sessionId
const activeConnections = new Map<string, ActiveConnection>()

const MAX_CONNECTIONS = 10
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const app: Express = express()
const port = process.env.PORT || 8888


app.use(express.json())


app.get("/", (req: Request, res: Response) => {
  res.send("MCP Service is running!")
})


app.get("/servers", (req: Request, res: Response) => {
  const servers = Object.entries(AVAILABLE_MCP_SERVERS).map(([ id, config ]) => ({
    id: id,
    name: config.displayName
  }))
  res.status(200).json({ servers: servers })
})


app.post("/connect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, serverId } = req.body

  if (!sessionId || typeof sessionId !== "string") {
    console.warn("[server]: /connect called without a valid sessionId")
    res.status(400).json({
      message: "Missing or invalid sessionId"
    })
    return
  }

  if (!serverId || typeof serverId !== "string" || !AVAILABLE_MCP_SERVERS[serverId]) {
    res.status(400).json({ message: `Missing or invalid serverId. Available: ${Object.keys(AVAILABLE_MCP_SERVERS).join(', ')}` })
    return
  }

  console.log(`[server]: /connect request received for sessionId: ${sessionId}`)

  // Check if connection already exists
  if (activeConnections.has(sessionId)) {
    console.log(`[server]: Session ${sessionId} is already connected`)
    res.status(200).json({
      message: "Already connected"
    })
    return
  }

  // Check connection limit
  if (activeConnections.size >= MAX_CONNECTIONS) {
    console.warn(`[server]: Connection limit ${MAX_CONNECTIONS} reached. Rejecting ${sessionId}`)
    res.status(503).json({
      message: "Service busy, connection limit reached"
    })
    return
  }

  if (!aiModel) {
    console.error(`[server]: Cannot connect ${sessionId}, AI model not initialized.`)
    res.status(500).json({ message: 'AI Service not configured on backend.' })
    return
  }

  // Handle existing connection
  const existingConnection = activeConnections.get(sessionId)

  if (existingConnection) {
    if (existingConnection.serverId === serverId) {
      console.log(`[server /connect]: Session ${sessionId} already connected to ${serverId}. Refreshing timestamp.`)
      res.status(200).json({ message: `Already connected to ${AVAILABLE_MCP_SERVERS[serverId].displayName}`})
      return
    } else {
      // Connecting to a different mcp server
      console.log(`[server /connect]: Session ${sessionId} switching from ${existingConnection.serverId} to ${serverId}. Disconnecting old client...`)
      const { error } = await asyncTryCatch(existingConnection.client.cleanup())
      if (error) {
        console.error(`[server /connect]: Error cleaning up old client ${existingConnection.serverId} for session ${sessionId}:`, error)
      }
      activeConnections.delete(sessionId)
    }
  }

  const { data: mcpClient, error: mcpClientError } = tryCatch(new MCPClient(aiModel, AVAILABLE_MCP_SERVERS[serverId]))

  if (!mcpClient || mcpClientError) {
    console.error(`[server]: Error establising connection for ${sessionId}:`, mcpClientError)
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
    serverId: serverId,
    client: mcpClient,
    lastActivityTimestamp: Date.now()
  }

  // Store the new connection
  activeConnections.set(sessionId, connectionData)

  console.log(`[server]: Connection established for ${sessionId}. Total connections: ${activeConnections.size}`)
  res.status(200).json({ message: "Connection successful" })
})


app.post("/disconnect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.body

  if (!sessionId || typeof sessionId !== "string") {
    console.warn("[server]: /disconnect called without a valid sessionId")
    res.status(400).json({ message: "Missing or invalid sessionId" })
    return
  }

  console.log(`[server]: /disconnect request received for sessionId: ${sessionId}`)

  const connectionData = activeConnections.get(sessionId)

  if (!connectionData) {
    console.log(`[server]: Session ${sessionId} not found for disconnection`)
    res.status(200).json({ message: "Session not found or already disconnected" })
    return
  }

  const { error } = await asyncTryCatch(connectionData.client.cleanup())

  if (error) {
    console.error(`[server]: Error during disconnection for ${sessionId}:`, error)
    res.status(500).json({ message: "Error during disconnection cleanup" })
    return
  }

  activeConnections.delete(sessionId)

  console.log(`[server]: Connection closed for ${sessionId}. Total connections: ${activeConnections.size}`)
  res.status(200).json({ message: "Disconnection successful" })
})


app.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, messages } = req.body

  if (!aiModel) {
    console.error(`[server /chat - Direct]: Cannot process direct chat, AI model not initialized.`)
    res.status(500).json({ message: 'AI Service not configured on backend.' });
    return
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.warn(`[server]: /chat called for ${sessionId} without a valid message array`)
    res.status(400).json({ message: "Missing or invalid messages array" })
    return
  }

  console.log(`[server]: /chat request received for sessionId: ${sessionId}`)

  const connectionData = activeConnections.get(sessionId)

  if (!connectionData) {
    console.log(`[server /chat]: No active MCP connection found for sessionId: ${sessionId}. Using direct AI call.`)

    const { data: directChatResponse, error } = await asyncTryCatch(MCPClient.directChat(aiModel, messages))

    if (error || !directChatResponse) {
      console.error(`[server /chat - Direct]: Error during direct AI call:`, error)
      res.status(500).json({ message: `Error processing direct chat: ${error}` })
      return
    }

    res.status(200).json({ response: directChatResponse })
    return
  }

  connectionData.lastActivityTimestamp = Date.now()
  console.log(`[server]: Updated last activity time for ${sessionId}`)

  const { data: response, error } = await asyncTryCatch(connectionData.client.chat(messages as CoreMessage[]))

  if (error || !response) {
    console.error(`[server]: Error during chat for ${sessionId}:`, error)
    res.status(500).json({ message: "Error processing chat message" })
    return
  }

  res.status(200).json({ response: response })
  return
})


// Start the server
app.listen(port, () => {
  console.log(`[server]: MCP Service listening on port ${port}`)
  console.log(`[server]: Initializing with ${activeConnections.size} connections.`)
  console.log(`[server]: Idle timeout set to ${IDLE_TIMEOUT_MS / 60000} minutes.`)
})

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
})
