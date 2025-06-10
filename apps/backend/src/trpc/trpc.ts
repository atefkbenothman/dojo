import { type Context } from "./context.js"
import { initTRPC, TRPCError } from "@trpc/server"

const t = initTRPC.context<Context>().create()

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User session not found or user is not authenticated.",
    })
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  })
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed)
