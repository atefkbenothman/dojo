import { getConvexUser } from "./auth"
import { convex } from "./convex-client"
import { throwError } from "./errors"
import { logger } from "./logger"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import type { Request, Response, NextFunction } from "express"

export interface SessionResult {
  session: Doc<"sessions"> | null
  error?: string
}

/**
 * Retrieves session information from request headers.
 * Handles both authenticated users (via Authorization header) and guest users (via x-guest-session-id header).
 * @param req Express request object
 * @returns Promise<SessionResult> containing session data or error information
 */
export async function getSessionFromRequest(req: Request): Promise<SessionResult> {
  try {
    // First, try to get authenticated user
    const user = await getConvexUser(req.headers.authorization)

    let session: Doc<"sessions"> | null = null

    if (user) {
      // Authenticated user: lookup by userId
      session = await convex.query(api.sessions.getByUserId, {
        userId: user._id,
      })
    } else {
      // Guest user: lookup by clientSessionId
      const clientSessionIdHeader = req.headers["x-guest-session-id"]
      const clientSessionId = Array.isArray(clientSessionIdHeader) ? clientSessionIdHeader[0] : clientSessionIdHeader

      if (clientSessionId) {
        session = await convex.query(api.sessions.getByClientSessionId, {
          clientSessionId,
        })
      }
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
 * Express middleware that attaches session to the request object.
 * Use this when you want to handle session errors in the route handler.
 */
export async function attachSessionMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = await getSessionFromRequest(req)

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
  const result = await getSessionFromRequest(req)

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
