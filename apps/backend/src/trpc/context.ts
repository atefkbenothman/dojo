import { getConvexUser } from "../auth.js"
import { convex } from "../convex-client.js"
import { api } from "@dojo/db/convex/_generated/api.js"
import { Doc } from "@dojo/db/convex/_generated/dataModel.js"
import { type CreateExpressContextOptions } from "@trpc/server/adapters/express"

export const createTRPCContext = async ({ req, res }: CreateExpressContextOptions) => {
  const authorization = req.headers.authorization
  const user = await getConvexUser(authorization)

  let session: Doc<"sessions"> | null = null

  // Authenticated users: lookup by userId
  if (user) {
    session = await convex.query(api.sessions.getByUserId, {
      userId: user._id,
    })

    if (!session) {
      console.warn(`[TRPC Context] No session found for authenticated user ${user._id}`)
    }
  }
  // Guest users: lookup by clientSessionId
  else {
    const clientSessionIdHeader = req.headers["x-guest-session-id"]
    const clientSessionId = (
      Array.isArray(clientSessionIdHeader) ? clientSessionIdHeader[0] : clientSessionIdHeader
    ) as string | undefined

    if (clientSessionId) {
      session = await convex.query(api.sessions.getByClientSessionId, {
        clientSessionId,
      })

      if (!session) {
        console.warn(`[TRPC Context] No session found for guest with clientSessionId ${clientSessionId}`)
      }
    }
  }

  if (session) {
    console.log(`[TRPC Context] Found session ${session._id}. User authenticated: ${!!session.userId}`)
  }

  return {
    req,
    res,
    session: session || undefined,
  }
}

export type Context = {
  req: CreateExpressContextOptions["req"]
  res: CreateExpressContextOptions["res"]
  session?: Doc<"sessions">
}
