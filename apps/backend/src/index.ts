import { agentRouter } from "./api/rest/routes/agent"
import { chatRouter } from "./api/rest/routes/chat"
import { workflowRouter } from "./api/rest/routes/workflow"
import { createTRPCContext } from "./api/trpc/context"
import { appRouter } from "./api/trpc/router"
import { convex } from "./lib/convex-client"
import { cleanupAllConnections, BACKEND_INSTANCE_ID } from "./services/mcp/connection"
import { startHeartbeat, stopHeartbeat, disconnectAllBackendConnections } from "./services/mcp/heartbeat"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import { env } from "@dojo/env/backend"
import { createExpressMiddleware } from "@trpc/server/adapters/express"
import { ImageModel, LanguageModel } from "ai"
import cors from "cors"
import express, { Express } from "express"

const PORT = env.PORT || 8888
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const models = await convex.query(api.models.list)
const mcpServers = await convex.query(api.mcp.list)

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session: Doc<"sessions"> | undefined
      aiModel: LanguageModel | ImageModel | undefined
      parsedInput: unknown
    }
  }
}

const app: Express = express()

app.use(
  cors({
    origin: ["http://localhost:3000", "https://dojoai.vercel.app/", "https://dojoai.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-trpc-source", "x-guest-session-id"],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
)

app.use(express.json({ limit: "10mb" }))

app.use("/api/chat", chatRouter)
app.use("/api/agent", agentRouter)
app.use("/api/workflow", workflowRouter)

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
  }),
)

/* Start the server */
const server = app.listen(PORT, () => {
  console.log("Starting server...")
  console.log(`[Core] Server listening on port ${PORT}`)
  console.log(`[Core] Backend instance ID: ${BACKEND_INSTANCE_ID}`)
  console.log(`[Core] Idle timeout set to ${IDLE_TIMEOUT_MS / 60000} minutes`)
  console.log("[Core] tRPC router mounted at /trpc")
  console.log("[Core] Configured MCP Servers:", mcpServers.map((mcp) => mcp.name).join(", "))
  console.log("[Core] AI Models:", models.map((model) => model.modelId).join(", "))

  // Start heartbeat service
  startHeartbeat(BACKEND_INSTANCE_ID)
})

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err)
  console.error("Stack:", err.stack)
  console.error("Name:", err.name)
  console.error("Message:", err.message)
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise)
  console.error("Reason:", reason)
  if (reason instanceof Error) {
    console.error("Stack:", reason.stack)
  }
})

// Graceful shutdown handlers
let isShuttingDown = false

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log(`[Core] Already shutting down, ignoring ${signal}`)
    return
  }

  isShuttingDown = true
  console.log(`[Core] ${signal} received, starting graceful shutdown...`)

  try {
    // Stop heartbeat service
    stopHeartbeat()

    // Mark all connections from this backend as disconnected
    await disconnectAllBackendConnections()

    // Stop accepting new connections
    console.log("[Core] Closing HTTP server...")
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err)
        } else {
          console.log("[Core] HTTP server closed")
          resolve()
        }
      })
    })

    // Clean up all MCP connections
    await cleanupAllConnections()

    console.log("[Core] Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    console.error("[Core] Error during graceful shutdown:", error)
    process.exit(1)
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Optional: Handle nodemon restarts
process.once("SIGUSR2", async () => {
  await gracefulShutdown("SIGUSR2")
  process.kill(process.pid, "SIGUSR2")
})
