import { connectionRouter } from "./routers/connection.js"
import { healthRouter } from "./routers/health.js"
import { imageRouter } from "./routers/image.js"
import { router } from "./trpc.js"

export const appRouter = router({
  connection: connectionRouter,
  health: healthRouter,
  image: imageRouter,
})

export type AppRouter = typeof appRouter
