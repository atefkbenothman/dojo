import { configRouter } from "./routers/config.js"
import { healthRouter } from "./routers/health.js"
import { router } from "./trpc.js"

export const appRouter = router({
  health: healthRouter,
  config: configRouter,
})

export type AppRouter = typeof appRouter
