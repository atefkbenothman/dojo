import * as path from "path"
import express, { Express, Request, Response } from "express"
import { CoreMessage, extractReasoningMiddleware, LanguageModel, wrapLanguageModel } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { MCPClient } from "./mcp-client"
import dotenv from "dotenv"

dotenv.config({
  path: path.resolve(process.cwd(), "../.env")
})

let aiModel: LanguageModel | null = null

try {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })
  aiModel = wrapLanguageModel({
    model: google("gemini-1.5-flash"),
    middleware: extractReasoningMiddleware({ tagName: "think" })
  })
} catch (err) {
  console.error("[server]: Failed to initialize central AI model:", err)
  aiModel = null
}

// Store active connections
interface ActiveConnection {
  client: MCPClient
  lastActivityTimestamp: number
}

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


app.post("/connect", async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.body

  if (!sessionId || typeof sessionId !== "string") {
    console.warn("[server]: /connect called without a valid sessionId")
    res.status(400).json({
      message: "Missing or invalid sessionId"
    })
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

  let mcpClient: MCPClient | null = null

  try {
    mcpClient = new MCPClient(aiModel)
    console.log(`[server]: Starting MCPClient connection for ${sessionId}...`)

    await mcpClient.start()

    const connectionData: ActiveConnection = {
      client: mcpClient,
      lastActivityTimestamp: Date.now()
    }

    // Store the new connection
    activeConnections.set(sessionId, connectionData)
    console.log(`[server]: Connection established for ${sessionId}. Total connections: ${activeConnections.size}`)

    res.status(200).json({ message: "Connection successful" })
  } catch (err) {
    console.error(`[server]: Error establising connection for ${sessionId}:`, err)
    activeConnections.delete(sessionId)
    res.status(500).json({ message: "Failed to establish connection" })
  }
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

  try {
    await connectionData.client.cleanup()

    activeConnections.delete(sessionId)
    console.log(`[server]: Connection closed for ${sessionId}. Total connections: ${activeConnections.size}`)

    res.status(200).json({ message: "Disconnection successful" })
  } catch (err) {
    console.error(`[server]: Error during disconnection for ${sessionId}:`, err)
    activeConnections.delete(sessionId)
    console.log(`[server]: Connection removed for ${sessionId} after error during close. Total connections: ${activeConnections.size}`)
    res.status(500).json({ message: "Error during disconnection cleanup" })
  }
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
    try {
      const response = await MCPClient.directChat(aiModel, messages)
      if (!response) {
        console.warn(`[server]: MCPClient chat for ${sessionId} returned undefined: ${response}`)
        res.status(500).json({ message: response })
        return
      }
      res.status(200).json({ response: response })
    } catch (err) {
      console.error(`[server /chat - Direct]: Error during direct AI call:`, err)
      res.status(500).json({ message: `Error processing direct chat: ${err}` })
    }
    return
  }

  connectionData.lastActivityTimestamp = Date.now()
  console.log(`[server]: Updated last activity time for ${sessionId}`)

  try {
    console.log(`[server]: Calling MCPClient chat for ${sessionId}...`)

    const response = await connectionData.client.chat(messages as CoreMessage[])

    if (!response) {
      console.warn(`[server]: MCPClient chat for ${sessionId} returned undefined: ${response}`)
      res.status(500).json({ message: response })
      return
    }

    res.status(200).json({ response: response })
    return
  } catch (err) {
    console.error(`[server]: Error during simulated chat for ${sessionId}:`, err)
    res.status(500).json({
      message: "Error processing chat message"
    })
    return
  }
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
