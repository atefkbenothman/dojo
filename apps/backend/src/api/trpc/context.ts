import { lookupSession } from "../../lib/session"
import { logger } from "../../lib/logger"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import { type CreateExpressContextOptions } from "@trpc/server/adapters/express"

export const createTRPCContext = async ({ req, res }: CreateExpressContextOptions) => {
  // Extract guest session ID from headers
  const clientSessionIdHeader = req.headers["x-guest-session-id"]
  const guestSessionId = Array.isArray(clientSessionIdHeader) ? clientSessionIdHeader[0] : clientSessionIdHeader || null

  // Use unified session lookup
  const { session, error } = await lookupSession({
    authorization: req.headers.authorization,
    guestSessionId,
  })

  if (session) {
    logger.debug("TRPC", `Found session ${session._id}. User authenticated: ${!!session.userId}`)
  } else if (error) {
    logger.debug("TRPC", `Session lookup failed: ${error}`)
  }

  return {
    req,
    res,
    session: session || undefined,
    authorization: req.headers.authorization,
  }
}

export type Context = {
  req: CreateExpressContextOptions["req"]
  res: CreateExpressContextOptions["res"]
  session?: Doc<"sessions">
  authorization?: string
}
