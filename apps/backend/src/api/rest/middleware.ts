import { createRequestClient } from "../../lib/convex-request-client"
import { throwError } from "../../lib/errors"
import { lookupSession } from "../../lib/session"
import type { Doc } from "@dojo/db/convex/_generated/dataModel"
import type { ConvexHttpClient } from "convex/browser"
import type { Request, Response, NextFunction } from "express"
import type { ZodSchema } from "zod"

/**
 * Creates a generic Express middleware for handling validated requests with sessions.
 * This middleware is responsible for:
 * 1. Validating the request body against a Zod schema.
 * 2. Creating an authenticated Convex client for the request.
 * 3. Determining the user's session from request headers.
 * 4. Attaching the session, client, and parsed input to the Express `req` object for downstream use.
 * @param schema A Zod schema to validate the request body.
 * @returns An Express middleware function.
 */
export function createValidatedRequestMiddleware<T>(schema: ZodSchema<T>) {
  return async function validatedRequestMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Validate request body
      const validationResult = schema.safeParse(req.body)
      if (!validationResult.success) {
        throwError("Invalid input", 400)
      }
      const parsedInput = validationResult.data

      // 2. Create authenticated Convex client for this request
      const client = createRequestClient(req.headers.authorization)

      // 3. Get session from request
      const clientSessionIdHeader = req.headers["x-guest-session-id"]
      const guestSessionId = Array.isArray(clientSessionIdHeader)
        ? clientSessionIdHeader[0]
        : clientSessionIdHeader || null

      const sessionResult = await lookupSession({
        guestSessionId,
        client,
      })

      if (!sessionResult.session) {
        throwError(sessionResult.error || "No active session found", 401)
      }
      req.session = sessionResult.session

      // 4. Attach data to request
      req.parsedInput = parsedInput
      req.client = client

      next()
    } catch (error) {
      next(error) // Pass error to error handling middleware
    }
  }
}

// Extend Express Request type to include all custom properties
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session: Doc<"sessions">
      parsedInput: any
      client: ConvexHttpClient
    }
  }
}
