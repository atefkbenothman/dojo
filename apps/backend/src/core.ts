import { convex } from "./convex-client.js"
import { agentRouter } from "./routes/agent.js"
import { chatRouter } from "./routes/chat.js"
import { workflowRouter } from "./routes/workflow.js"
import { createTRPCContext } from "./trpc/context.js"
import { appRouter } from "./trpc/router.js"
import { api } from "@dojo/db/convex/_generated/api.js"
import { Doc } from "@dojo/db/convex/_generated/dataModel.js"
import { env } from "@dojo/env/backend"
import { createExpressMiddleware } from "@trpc/server/adapters/express"
import { ImageModel, LanguageModel } from "ai"
import cors from "cors"
import express, { Express } from "express"

const PORT = env.PORT || 8888
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const models = await convex.query(api.models.list)
const mcpServers = await convex.query(api.mcp.list)

// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
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
app.listen(PORT, () => {
  console.log("Starting server...")
  console.log(`[Core] Server listening on port ${PORT}`)
  console.log(`[Core] Idle timeout set to ${IDLE_TIMEOUT_MS / 60000} minutes`)
  console.log("[Core] tRPC router mounted at /trpc")
  console.log("[Core] Configured MCP Servers:", mcpServers.map((mcp) => mcp.name).join(", "))
  console.log("[Core] AI Models:", models.map((model) => model.modelId).join(", "))
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
