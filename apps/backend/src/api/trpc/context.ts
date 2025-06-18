import { getConvexUser } from "../../lib/auth"
import { logger } from "../../lib/logger"
import { convex } from "../../lib/convex-client"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
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
      logger.debug("TRPC", `No session found for authenticated user ${user._id}`)
    }
  }
  // Guest users: lookup by clientSessionId
  else {
    const clientSessionIdHeader = req.headers["x-guest-session-id"]
    const clientSessionId = Array.isArray(clientSessionIdHeader) ? clientSessionIdHeader[0] : clientSessionIdHeader

    if (clientSessionId) {
      session = await convex.query(api.sessions.getByClientSessionId, {
        clientSessionId,
      })

      if (!session) {
        logger.debug("TRPC", `No session found for guest with clientSessionId ${clientSessionId}`)
      }
    }
  }

  if (session) {
    logger.debug("TRPC", `Found session ${session._id}. User authenticated: ${!!session.userId}`)
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
