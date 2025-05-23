import { userContextMiddleware } from "./middleware/user-context.js"
import agentRouter from "./routes/agent.js"
import chatRouter from "./routes/chat.js"
import configRouter from "./routes/config.js"
import connectionRouter from "./routes/connection.js"
import imageRouter from "./routes/image.js"
import type { UserSession, ActiveMcpClient } from "./types.js"
import { CONFIGURED_MCP_SERVERS, AI_MODELS } from "@dojo/config"
import cors from "cors"
import express, { Express, Request, Response } from "express"

const PORT = process.env.PORT || 8888

export const MAX_CONNECTIONS = 10
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const app: Express = express()

app.use(
  cors({
    origin: ["http://localhost:3000", "https://dojoai.vercel.app/"],
    methods: ["GET", "POST"],
  }),
)

app.use(express.json({ limit: "10mb" }))

app.use("/", configRouter)
app.use("/", imageRouter)
app.use("/", chatRouter)
app.use("/", connectionRouter)

app.use("/agent", userContextMiddleware, agentRouter)

console.log("[Core] Configured MCP Servers:", Object.keys(CONFIGURED_MCP_SERVERS).join(", "))
console.log("[Core] AI Models:", Object.keys(AI_MODELS).join(", "))

export const sessions = new Map<string, UserSession>()

export function getOrCreateUserSession(userId: string): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, { userId: userId, activeMcpClients: new Map<string, ActiveMcpClient>() })
  }
  return sessions.get(userId)!
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
