import { agentRouter } from "./api/rest/routes/agent"
import { chatRouter } from "./api/rest/routes/chat"
import { generationRouter } from "./api/rest/routes/generation"
import { workflowRouter } from "./api/rest/routes/workflow"
import { createTRPCContext } from "./api/trpc/context"
import { appRouter } from "./api/trpc/router"
import { convex } from "./lib/convex-request-client"
import { errorHandlerMiddleware } from "./lib/errors"
import { logger } from "./lib/logger"
import { mcpConnectionManager } from "./services/mcp/connection-manager"
import { startHeartbeat, stopHeartbeat, disconnectAllBackendConnections } from "./services/mcp/heartbeat"
import { api } from "@dojo/db/convex/_generated/api"
import { env } from "@dojo/env/backend"
import { createExpressMiddleware } from "@trpc/server/adapters/express"
import cors from "cors"
import express, { Express } from "express"

const PORT = env.PORT || 8888
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

// Generate a unique backend instance ID (could be hostname + process.pid)
export const BACKEND_INSTANCE_ID = `${process.env.HOSTNAME || "localhost"}-${process.pid}-${Date.now()}`

const models = await convex.query(api.models.list)
const mcpServers = await convex.query(api.mcp.list)


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
app.use("/api/generate", generationRouter)

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
  }),
)

// Error handling middleware - must be last
app.use(errorHandlerMiddleware)

/* Start the server */
const server = app.listen(PORT, () => {
  logger.info("Core", "Starting server...")
  logger.info("Core", `Server listening on port ${PORT}`)
  logger.info("Core", `Backend instance ID: ${BACKEND_INSTANCE_ID}`)
  logger.info("Core", `Idle timeout set to ${IDLE_TIMEOUT_MS / 60000} minutes`)
  logger.info("Core", "tRPC router mounted at /trpc")
  logger.info("Core", `Configured MCP Servers: ${mcpServers.map((mcp) => mcp.name).join(", ")}`)
  logger.info("Core", `AI Models: ${models.map((model) => model.modelId).join(", ")}`)

  // Start heartbeat service
  startHeartbeat(BACKEND_INSTANCE_ID)
})

process.on("uncaughtException", (err) => {
  logger.error("Core", "Uncaught Exception", err)
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Core", "Unhandled Rejection", { reason, promise })
})

// Graceful shutdown handlers
let isShuttingDown = false

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.info("Core", `Already shutting down, ignoring ${signal}`)
    return
  }

  isShuttingDown = true
  logger.info("Core", `${signal} received, starting graceful shutdown...`)

  try {
    // Stop heartbeat service
    stopHeartbeat()

    // Mark all connections from this backend as disconnected
    await disconnectAllBackendConnections()

    // Stop accepting new connections
    logger.info("Core", "Closing HTTP server...")
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err)
        } else {
          logger.info("Core", "HTTP server closed")
          resolve()
        }
      })
    })

    // Clean up all MCP connections
    await mcpConnectionManager.cleanupAllConnections()

    logger.info("Core", "Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    logger.error("Core", "Error during graceful shutdown", error)
    process.exit(1)
  }
}

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM")
})
process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT")
})

// Optional: Handle nodemon restarts
process.once("SIGUSR2", () => {
  void (async () => {
    await gracefulShutdown("SIGUSR2")
    process.kill(process.pid, "SIGUSR2")
  })()
})
