import * as path from "path"

import express, { Express, Request, Response } from "express"
import { CoreMessage } from "ai"
import { MCPClient } from "./mcp-client"


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

  let mcpClient: MCPClient | null = null

  try {
    mcpClient = new MCPClient(path.resolve(process.cwd(), ".."))
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

  if (!sessionId || typeof sessionId !== "string") {
    console.warn("[server]: /chat called without a valid sessionId")
    res.status(400).json({ message: "Missing or invalid sessionId" })
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
    console.log(`[server]: Session ${sessionId} not found for chat`)
    res.status(404).json({
      message: "Sesssion not found or not connected. Please connect first"
    })
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
