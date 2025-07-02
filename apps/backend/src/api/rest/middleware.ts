import { throwError } from "../../lib/errors"
import { lookupSession } from "../../lib/session"
import type { Request, Response, NextFunction } from "express"
import type { ZodSchema } from "zod"

// Define the expected shape of parsed input
interface ParsedInputBase {
  chat?: { modelId: string }
  agent?: { modelId: string }
  workflow?: { modelId: string }
  generation?: { modelId: string }
}

/**
 * Creates a simplified Express middleware for handling validated requests with sessions.
 * This middleware is responsible for:
 * 1. Validating the request body against a Zod schema.
 * 2. Determining the user's session from request headers.
 * 3. Extracting and validating the modelId from the request.
 * 4. Attaching the session, modelId, and parsed input to the Express `req` object for downstream use.
 * Note: The route handler is responsible for API key management and model creation.
 * @param schema A Zod schema to validate the request body.
 * @returns An Express middleware function.
 */
export function createValidatedRequestMiddleware<T extends ParsedInputBase>(schema: ZodSchema<T>) {
  return async function validatedRequestMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Validate request body
      const validationResult = schema.safeParse(req.body)
      if (!validationResult.success) {
        throwError("Invalid input", 400)
      }
      const parsedInput = validationResult.data

      // 2. Get session from request  
      const clientSessionIdHeader = req.headers["x-guest-session-id"]
      const guestSessionId = Array.isArray(clientSessionIdHeader) ? clientSessionIdHeader[0] : clientSessionIdHeader || null

      const sessionResult = await lookupSession({
        authorization: req.headers.authorization,
        guestSessionId,
      })
      
      if (!sessionResult.session) {
        throwError(sessionResult.error || "No active session found", 401)
      }
      req.session = sessionResult.session

      // 3. Extract and validate model ID
      const modelId = parsedInput.chat?.modelId || parsedInput.agent?.modelId || parsedInput.workflow?.modelId || parsedInput.generation?.modelId
      if (!modelId) {
        throwError("Missing modelId in chat, agent, or workflow object", 400)
      }

      // 4. Attach data to request
      req.parsedInput = parsedInput
      req.modelId = modelId

      next()
    } catch (error) {
      next(error) // Pass error to error handling middleware
    }
  }
}
