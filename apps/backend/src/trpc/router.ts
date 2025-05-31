import { agentRouter } from "./routers/agent.js"
import { chatRouter } from "./routers/chat.js"
import { configRouter } from "./routers/config.js"
import { connectionRouter } from "./routers/connection.js"
import { healthRouter } from "./routers/health.js"
import { imageRouter } from "./routers/image.js"
import { router } from "./trpc.js"

export const appRouter = router({
  connection: connectionRouter,
  config: configRouter,
  health: healthRouter,
  chat: chatRouter,
  image: imageRouter,
  agent: agentRouter,
})

export type AppRouter = typeof appRouter
