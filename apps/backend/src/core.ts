import { createTRPCContext } from "./trpc/context.js"
import { appRouter } from "./trpc/router.js"
import type { ActiveMcpClient, UserSession } from "./types.js"
import { CONFIGURED_MCP_SERVERS, AI_MODELS } from "@dojo/config"
import { createExpressMiddleware } from "@trpc/server/adapters/express"
import cors from "cors"
import express, { Express } from "express"

const PORT = process.env.PORT || 8888

export const MAX_CONNECTIONS = 10
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const app: Express = express()

const allowedOrigins = ["http://localhost:3000", "https://dojoai.vercel.app/", "https://dojoai.vercel.app"]

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-trpc-source", "X-User-Id"],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
)

app.use(express.json({ limit: "10mb" }))

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
  }),
)

export const sessions = new Map<string, UserSession>()

export let totalConnections = 0

export function getOrCreateUserSession(userId: string): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, { userId: userId, activeMcpClients: new Map<string, ActiveMcpClient>() })
  }
  return sessions.get(userId)!
}

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
  console.log("[Core] tRPC router mounted at /trpc")
  console.log("[Core] Configured MCP Servers:", Object.keys(CONFIGURED_MCP_SERVERS).join(", "))
  console.log("[Core] AI Models:", Object.keys(AI_MODELS).join(", "))
})

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
})
