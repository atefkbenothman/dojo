import { getConvexUser } from "./auth"
import { createRequestClient, createClientFromAuth } from "./convex-request-client"
import { throwError } from "./errors"
import { logger } from "./logger"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import type { Request, Response, NextFunction } from "express"

export interface SessionResult {
  session: Doc<"sessions"> | null
  error?: string
}

export interface SessionLookupParams {
  authorization?: string | null
  guestSessionId?: string | null
}

/**
 * Helper function to extract guest session ID from request headers.
 * Handles both single string and array formats.
 * @param headers Express request headers
 * @returns Guest session ID or null if not found
 */
function extractGuestSessionId(headers: Request["headers"]): string | null {
  const clientSessionIdHeader = headers["x-guest-session-id"]
  return Array.isArray(clientSessionIdHeader) ? clientSessionIdHeader[0] || null : clientSessionIdHeader || null
}

/**
 * Core session lookup logic used by both Express and TRPC.
 * Handles both authenticated users (via authorization) and guest users (via guestSessionId).
 * @param params Session lookup parameters
 * @returns Promise<SessionResult> containing session data or error information
 */
export async function lookupSession(params: SessionLookupParams): Promise<SessionResult> {
  try {
    const { authorization, guestSessionId } = params

    // First, try to get authenticated user
    const user = await getConvexUser(authorization || undefined)

    // Create a client for this request (with auth if available)
    const client = authorization ? createClientFromAuth(authorization) : createRequestClient()

    let session: Doc<"sessions"> | null = null

    if (user) {
      // Authenticated user: lookup by userId
      session = await client.query(api.sessions.getByUserId, {
        userId: user._id,
      })
    } else if (guestSessionId) {
      // Guest user: lookup by clientSessionId
      session = await client.query(api.sessions.getByClientSessionId, {
        clientSessionId: guestSessionId,
      })
    }

    if (!session) {
      return {
        session: null,
        error: "No active session found. Please refresh the page and try again.",
      }
    }

    return { session }
  } catch (error) {
    logger.error("Session", "Error retrieving session", error)
    return {
      session: null,
      error: "Failed to retrieve session. Please try again.",
    }
  }
}

/**
 * Retrieves session information from Express request headers.
 * Handles both authenticated users (via Authorization header) and guest users (via x-guest-session-id header).
 * @param req Express request object
 * @returns Promise<SessionResult> containing session data or error information
 */
export async function getSessionFromRequest(req: Request): Promise<SessionResult> {
  return lookupSession({
    authorization: req.headers.authorization,
    guestSessionId: extractGuestSessionId(req.headers),
  })
}

/**
 * Express middleware that attaches session to the request object.
 * Use this when you want to handle session errors in the route handler.
 */
export async function attachSessionMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = await lookupSession({
    authorization: req.headers.authorization,
    guestSessionId: extractGuestSessionId(req.headers),
  })

  // Attach session to request (can be null if no session found)
  req.session = result.session || undefined

  // Also attach any error for the route handler to decide what to do
  if (result.error) {
    req.sessionError = result.error
  }

  next()
}

/**
 * Express middleware that requires a valid session.
 * Throws AuthenticationError if no session is found.
 */
export async function requireSessionMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = await lookupSession({
    authorization: req.headers.authorization,
    guestSessionId: extractGuestSessionId(req.headers),
  })

  if (!result.session) {
    throwError(result.error || "Session required", 401)
  }

  req.session = result.session
  next()
}

// Extend Express Request type to include session and sessionError
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Doc<"sessions">
      sessionError?: string
    }
  }
}
