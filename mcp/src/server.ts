import * as path from "path"
import dotenv from "dotenv"
import cors from "cors"
import express, { Express, Request, Response } from "express"
import { type CoreMessage, streamText, ToolSet, experimental_generateImage as generateImage } from "ai"
import { MCPClient } from "./client"
import { asyncTryCatch, tryCatch } from "./utils"
import sseRouter from "./file-watcher"
import type { GenerateImageOptions, UserSession, ActiveMcpClient } from "./types"
import agentRouter from "./agent"

dotenv.config({
  path: path.resolve(__dirname, "..", ".env"),
})

import {
  DEFAULT_MODEL_ID,
  AVAILABLE_MCP_SERVERS,
  AVAILABLE_IMAGE_MODELS,
  AVAILABLE_AI_MODELS,
  DEFAULT_IMAGE_MODEL_ID,
} from "./config"

const PORT = process.env.PORT || 8888

const MAX_CONNECTIONS = 10
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const app: Express = express()

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  }),
)

app.use(express.json({ limit: "10mb" }))

app.use("/files", sseRouter)
app.use("/agent", agentRouter)

console.log("[server] Available MCP Servers:", Object.keys(AVAILABLE_MCP_SERVERS).join(", "))
console.log("[server] Available AI Models:", Object.keys(AVAILABLE_AI_MODELS).join(", "))
console.log("[server] Available Image Models:", Object.keys(AVAILABLE_IMAGE_MODELS).join(", "))

const sessions = new Map<string, UserSession>()

// Creating a helper function to get or initialize a user session
function getOrCreateUserSession(sessionId: string): UserSession {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { activeMcpClients: new Map<string, ActiveMcpClient>() })
  }
  return sessions.get(sessionId)!
}

// Keep track of total connections across all sessions
let totalConnections = 0

// Setup cleanup of idle connections
// setInterval(async () => {
//   console.log(`[server]: Checking for idle connections. Current total: ${totalConnections}`)
//   for (const [sessionId, userSession] of sessions.entries()) {
//     for (const [serverId, client] of userSession.activeMcpClients.entries()) {
//       // For now we'll use a simple timeout mechanism
//       // In a real-world implementation you might want to track last activity time per connection
//       await cleanupExistingConnection(sessionId, serverId)
//       console.log(`[server]: Cleaned up idle connection for session ${sessionId}, server ${serverId}`)
//     }
//     // Remove the session if it has no active connections
//     if (userSession.activeMcpClients.size === 0) {
//       sessions.delete(sessionId)
//       console.log(`[server]: Removed empty session ${sessionId}`)
//     }
//   }
// }, IDLE_TIMEOUT_MS)

/* Start the server */
app.listen(PORT, () => {
  console.log(`[server] MCP Service listening on port ${PORT}`)
  console.log(`[server] Initializing with ${totalConnections} connections.`)
  console.log(`[server] Idle timeout set to ${IDLE_TIMEOUT_MS / 60000} minutes.`)
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
  if (!config.id || typeof config.id !== "string") return false
  return true
}

// Function to check if a specific server connection already exists
const validateServerConnection = (sessionId: string, serverId: string): boolean => {
  const userSession = sessions.get(sessionId)
  if (!userSession) return true
  // Check if this specific server is already connected
  if (userSession.activeMcpClients.has(serverId)) {
    console.log(`[server] Session ${sessionId} already has a connection to server ${serverId}`)
    return false
  }
  return true
}

const cleanupExistingConnection = async (sessionId: string, mcpServerId: string): Promise<void> => {
  const userSession = sessions.get(sessionId)
  if (!userSession) return

  const existingClient = userSession.activeMcpClients.get(mcpServerId)
  if (existingClient) {
    const { error } = await asyncTryCatch(existingClient.client.cleanup())
    if (error) {
      console.error(
        `[server /connect]: Error cleaning up client for session ${sessionId}, server ${mcpServerId}:`,
        error,
      )
    }
    userSession.activeMcpClients.delete(mcpServerId)
    totalConnections--
  }
}

/* Connect */
app.post("/connect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, config } = req.body

  if (!validateReqBody(sessionId, config)) {
    res.status(400).json({ message: "Missing or invalid sessionId or config" })
    return
  }

  console.log(`[server] /connect request received for sessionId: ${sessionId}, mcpServer: ${config.id}`)

  if (!validateServerConnection(sessionId, config.id)) {
    res.status(400).json({ message: `Server ${config.id} is already connected for this session` })
    return
  }

  await cleanupExistingConnection(sessionId, config.id)

  if (totalConnections >= MAX_CONNECTIONS) {
    res.status(503).json({ message: "Service busy, connection limit reached" })
    return
  }

  const userSession = getOrCreateUserSession(sessionId)

  const { data: mcpClient, error: mcpClientError } = tryCatch(new MCPClient(config))

  if (!mcpClient || mcpClientError) {
    console.error(`[server] Error establishing connection for ${sessionId}, server ${config.id}:`, mcpClientError)
    res.status(500).json({ message: "Failed to establish connection" })
    return
  }

  console.log(`[server] Starting MCPClient connection for ${sessionId}, server ${config.id}...`)

  // Start mcp server
  const { error: mcpStartError } = await asyncTryCatch(mcpClient.start())

  if (mcpStartError) {
    console.error(`[server] Error starting MCPClient for ${sessionId}, server ${config.id}`)
    res.status(500).json({ message: "Failed to start MCPClient" })
    return
  }

  const activeMcpClient: ActiveMcpClient = {
    client: mcpClient,
    config: config,
  }

  userSession.activeMcpClients.set(config.id, activeMcpClient)
  totalConnections++

  console.log(
    `[server] Connection established for ${sessionId}, server ${config.id}. Total connections: ${totalConnections}`,
  )

  const tools = mcpClient.tools

  res.status(200).json({ tools })
})

/* Disconnect */
app.post("/disconnect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, serverId } = req.body

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ message: "Missing or invalid sessionId" })
    return
  }

  if (!serverId || typeof serverId !== "string") {
    res.status(400).json({ message: "Missing or invalid serverId" })
    return
  }

  console.log(`[server] /disconnect request received for sessionId: ${sessionId}, server: ${serverId}`)

  await cleanupExistingConnection(sessionId, serverId)

  console.log(
    `[server] Connection closed for ${sessionId}, server: ${serverId}. Total connections: ${totalConnections}`,
  )
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

/* Chat Stream */
app.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, messages, modelId } = req.body

  const model = modelId || DEFAULT_MODEL_ID

  const validation = validateChatRequest(messages, model)
  if (!validation.isValid) {
    res.status(validation.error?.includes("configured") ? 500 : 400).json({ message: validation.error })
    return
  }

  console.log(`[server] /chat request received for sessionId: ${sessionId}, using model: ${model}`)

  const aiModel = AVAILABLE_AI_MODELS[model].languageModel

  const userSession = sessions.get(sessionId)

  const combinedTools: ToolSet = {}

  if (userSession) {
    for (const mcpClient of userSession.activeMcpClients.values()) {
      const clientTools = mcpClient.client.tools || {}
      Object.assign(combinedTools, clientTools)
    }
  }

  console.log(`[server /chat]: Using ${Object.keys(combinedTools).length} total tools`)

  const result = await streamText({
    model: aiModel,
    messages: messages as CoreMessage[],
    tools: combinedTools,
    maxSteps: 10,
  })

  const response = result.toDataStreamResponse()

  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  res.status(response.status)

  if (response.body) {
    for await (const chunk of response.body) {
      res.write(chunk)
    }
    res.end()
  }
  res.end()
})

/* Image */
app.post("/image", async (req: Request, res: Response): Promise<void> => {
  const { prompt, modelId, n } = req.body

  const aiModel = AVAILABLE_IMAGE_MODELS[modelId] ?? AVAILABLE_IMAGE_MODELS[DEFAULT_IMAGE_MODEL_ID]
  console.log(`[server] /image request received using model: ${aiModel.modelName}`)

  try {
    const options: GenerateImageOptions = { n }

    const { images } = await generateImage({
      model: aiModel.imageModel,
      prompt: prompt,
      n: options.n,
    })

    const resultImages = images.map((img) => ({ base64: img.base64 }))
    res.status(200).json({ images: resultImages })
  } catch (error) {
    console.error(`[server /image]: Error generating image:`, error)
    res.status(500).json({ error: "Failed to generate image" })
  }
})
