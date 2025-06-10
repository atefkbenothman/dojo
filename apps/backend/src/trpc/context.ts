import { getConvexUser } from "../auth.js"
import { convex } from "../convex-client.js"
import { api } from "@dojo/db/convex/_generated/api.js"
import { Id } from "@dojo/db/convex/_generated/dataModel.js"
import { Doc } from "@dojo/db/convex/_generated/dataModel.js"
import { type CreateExpressContextOptions } from "@trpc/server/adapters/express"

export const createTRPCContext = async ({ req, res }: CreateExpressContextOptions) => {
  const authorization = req.headers.authorization
  const user = await getConvexUser(authorization)

  // For guest users
  const guestSessionIdHeader = req.headers["x-guest-session-id"]
  const guestSessionId = (Array.isArray(guestSessionIdHeader) ? guestSessionIdHeader[0] : guestSessionIdHeader) as
    | Id<"sessions">
    | undefined

  // This one mutation handles all cases: new guests, returning guests, and authenticated users.
  // It will also handle merging a guest session when a user logs in.
  const session = await convex.mutation(api.sessions.getOrCreate, {
    userId: user?._id,
    guestSessionId: guestSessionId,
  })

  if (!session) {
    console.error("[TRPC Context] Critical error: Failed to get or create a session from Convex.")
    return {
      req,
      res,
      session: undefined,
    }
  } else {
    console.log(`[TRPC Context] Session ${session._id} ready. User authenticated: ${!!session.userId}`)
  }

  return {
    req,
    res,
    session,
  }
}

export type Context = {
  req: CreateExpressContextOptions["req"]
  res: CreateExpressContextOptions["res"]
  session?: Doc<"sessions">
}
