import { connectionRouter } from "./routers/connection"
import { healthRouter } from "./routers/health"
import { imageRouter } from "./routers/image"
import { router } from "./trpc"

export const appRouter = router({
  connection: connectionRouter,
  health: healthRouter,
  image: imageRouter,
})

export type AppRouter = typeof appRouter
