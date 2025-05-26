import { publicProcedure, router } from "../trpc.js"

export const healthRouter = router({
  get: publicProcedure.query(() => {
    console.log("health check queried")
    return { status: "ok" }
  }),
})
