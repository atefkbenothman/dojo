import * as path from "path"
import cors from "cors"
import express, { Express, Request, Response } from "express"
import { CoreMessage, extractReasoningMiddleware, wrapLanguageModel } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { MCPClient } from "./mcp-client"
import type { MCPServerConfig, ActiveConnection, AIModelConfig } from "./types"
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

const AVAILABLE_AI_MODELS: Record<string, AIModelConfig>  = {
  "gemini-1.5-flash": {
    name: "Google Gemini",
    modelName: "gemini-1.5-flash",
    languageModel: wrapLanguageModel({
      model: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })("gemini-1.5-flash"),
      middleware: extractReasoningMiddleware({ tagName: "think" })
    })
  },
  "deepseek-r1-distill-llama-70b": {
    name: "Deepseek",
    modelName: "deepseek-r1-distill-llama-70b",
    languageModel: wrapLanguageModel({
      model: createGroq({ apiKey: process.env.GROQ_API_KEY })("deepseek-r1-distill-llama-70b"),
      middleware: extractReasoningMiddleware({ tagName: "think" })
    })
  }
}

const DEFAULT_MODEL_ID = "gemini-1.5-flash"

console.log("[server]: Available AI Models:", Object.keys(AVAILABLE_AI_MODELS).join(", "))

// In-memory map to hold active connections, keyed by sessionId
const activeConnections = new Map<string, ActiveConnection>()

const MAX_CONNECTIONS = 10
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const app: Express = express()
const port = process.env.PORT || 8888

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"]
}))

app.use(express.json())


app.get("/", (req: Request, res: Response) => {
  res.send("MCP Service is running!")
})


/* Servers */
app.get("/servers", (req: Request, res: Response) => {
  const servers = Object.entries(AVAILABLE_MCP_SERVERS).map(([ id, config ]) => ({
    id: id,
    name: config.displayName
  }))
  res.status(200).json({ servers: servers })
})


/* Connect */
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

  const mcpServer = AVAILABLE_MCP_SERVERS[serverId]

  const { data: mcpClient, error: mcpClientError } = tryCatch(new MCPClient(mcpServer))

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


/* Disconnect */
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


/* Chat */
app.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, messages, modelId } = req.body

  const model = modelId || DEFAULT_MODEL_ID

  const aiModel = AVAILABLE_AI_MODELS[model].languageModel

  if (!aiModel) {
    console.error(`[server /chat - Direct]: Cannot process direct chat, AI model not initialized.`)
    res.status(500).json({ message: 'AI Model not configured on backend.' });
    return
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.warn(`[server]: /chat called for ${sessionId} without a valid message array`)
    res.status(400).json({ message: "Missing or invalid messages array" })
    return
  }

  console.log(`[server]: /chat request received for sessionId: ${sessionId} using model: ${model}`)

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

  const { data: response, error } = await asyncTryCatch(connectionData.client.chat(aiModel, messages as CoreMessage[]))

  if (error || !response) {
    console.error(`[server]: Error during chat for ${sessionId}:`, error)
    res.status(400).json({ message: "Error processing chat message" })
    return
  }

  res.status(200).json({ response: response })
  return
})


/* Stream */
app.post("/stream", async (req: Request, res: Response): Promise<void> => {
  const { messages, modelId } = req.body

  if (!messages || !modelId) {
    console.error("[server /stream]: messages or modelId not provided")
    res.status(400).json({ message: "Messages or modelId not provided" })
    return
  }

  const model = modelId || DEFAULT_MODEL_ID
  const aiModel = AVAILABLE_AI_MODELS[model].languageModel

  const { data: response, error } = await asyncTryCatch(MCPClient.directChat(aiModel, messages))

  if (error || !response) {
    console.error("[server /stream]: Error streaming text:", error)
    res.status(500).json({ message: `Error streaming text: ${error}`})
    return
  }

  response.headers.forEach((value ,key) => {
    if (key.toLowerCase() === "content-type") {
      res.setHeader(key, value)
    }
  })

  res.status(response.status)

  if (!response.body) {
    console.error("[server /stream]: Web API Response body was null")
    res.end()
    return
  }

  const reader = response.body.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    if (value) {
      res.write(value)
    }
  }
  res.end()
})


/* Start the server */
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
