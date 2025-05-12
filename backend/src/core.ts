import cors from "cors"
import express, { Express, Request, Response } from "express"
import { startWatching, watcherEmitter } from "./files/watcher"
import { broadcastSseEvent } from "./sse"
import { AVAILABLE_MCP_SERVERS, AVAILABLE_IMAGE_MODELS, AVAILABLE_AI_MODELS, WATCH_DIRECTORY_PATH } from "./config"
import type { UserSession, ActiveMcpClient, FileBatchChangeEvent } from "./types"

import serversRouter from "./routes/servers"
import imageRouter from "./routes/image"
import chatRouter from "./routes/chat"
import connectionRouter from "./routes/connection"
import filesRouter from "./routes/files"
import agentRouter from "./routes/agent"

const PORT = process.env.PORT || 8888

export const MAX_CONNECTIONS = 10
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const app: Express = express()

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  }),
)

app.use(express.json({ limit: "10mb" }))

app.use("/", serversRouter)
app.use("/", imageRouter)
app.use("/", chatRouter)
app.use("/", connectionRouter)

app.use("/files", filesRouter)
app.use("/agent", agentRouter)

console.log("[Core] Available MCP Servers:", Object.keys(AVAILABLE_MCP_SERVERS).join(", "))
console.log("[Core] Available AI Models:", Object.keys(AVAILABLE_AI_MODELS).join(", "))
console.log("[Core] Available Image Models:", Object.keys(AVAILABLE_IMAGE_MODELS).join(", "))

export const sessions = new Map<string, UserSession>()

export function getOrCreateUserSession(sessionId: string): UserSession {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { activeMcpClients: new Map<string, ActiveMcpClient>() })
  }
  return sessions.get(sessionId)!
}

export let totalConnections = 0

export function incrementTotalConnections() {
  totalConnections++
}

export function decrementTotalConnections() {
  totalConnections--
}

/* Start the server */
app.listen(PORT, () => {
  console.log(`[Core] Server listening on port ${PORT}`)
  console.log(`[Core] Initializing with ${totalConnections} connections`)
  console.log(`[Core] Idle timeout set to ${IDLE_TIMEOUT_MS / 60000} minutes`)
  console.log(`[Core] Watch directory target configured as: ${WATCH_DIRECTORY_PATH}`)

  startWatching()

  // Connect watcher events to SSE broadcaster
  watcherEmitter.on("fileBatchChanged", (batchEvent: FileBatchChangeEvent) => {
    broadcastSseEvent(batchEvent)
  })
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
