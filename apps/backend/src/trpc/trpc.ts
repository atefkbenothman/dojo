import { type Context } from "./context.js"
import { initTRPC, TRPCError } from "@trpc/server"

const t = initTRPC.context<Context>().create()

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userSession || !ctx.userSession.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User session not found or invalid. Authentication via X-User-Id header is required.",
    })
  }
  return next({
    ctx: {
      userSession: ctx.userSession,
    },
  })
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed)
