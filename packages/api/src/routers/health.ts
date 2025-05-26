import { publicProcedure, router } from "../trpc.js"

export const healthRouter = router({
  get: publicProcedure.query(() => {
    return { status: "ok" }
  }),
})
