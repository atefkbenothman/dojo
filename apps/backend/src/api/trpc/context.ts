import { createRequestClient } from "../../lib/convex-request-client"
import { logger } from "../../lib/logger"
import { lookupSession } from "../../lib/session"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import { type CreateExpressContextOptions } from "@trpc/server/adapters/express"
import type { ConvexHttpClient } from "convex/browser"

export const createTRPCContext = async ({ req, res }: CreateExpressContextOptions) => {
  // Create authenticated Convex client for this request
  const client = createRequestClient(req.headers.authorization)

  // Extract guest session ID from headers
  const clientSessionIdHeader = req.headers["x-guest-session-id"]
  const guestSessionId = Array.isArray(clientSessionIdHeader) ? clientSessionIdHeader[0] : clientSessionIdHeader || null

  // Use unified session lookup
  const { session, error } = await lookupSession({
    guestSessionId,
    client,
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
    client,
  }
}

export type Context = {
  req: CreateExpressContextOptions["req"]
  res: CreateExpressContextOptions["res"]
  session?: Doc<"sessions">
  client: ConvexHttpClient
}
