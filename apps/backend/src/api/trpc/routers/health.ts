import { publicProcedure, router } from "../trpc"

export const healthRouter = router({
  get: publicProcedure.query(() => {
    return { status: "ok" }
  }),
})
