import { getModelInstance, getModelRequiresApiKey, getModelFallbackApiKey } from "../ai/models.js"
import { getConvexUser } from "../auth.js"
import { convex } from "../convex-client.js"
import { api } from "@dojo/db/convex/_generated/api.js"
import { Doc } from "@dojo/db/convex/_generated/dataModel.js"
import { tryCatch } from "@dojo/utils"
import type { Request, Response, NextFunction } from "express"
import type { ZodSchema } from "zod"

/**
 * Creates a reusable Express middleware for handling AI-related requests.
 * This middleware is responsible for:
 * 1. Validating the request body against a Zod schema.
 * 2. Determining the user's session (authenticated or guest) from request headers.
 * 3. Validating and preparing the specified AI model, including API key checks.
 * 4. Attaching the session, AI model instance, and parsed input to the Express `req` object for downstream use.
 * @param schema A Zod schema to validate the request body.
 * @returns An Express middleware function.
 */
export function createAiRequestMiddleware(schema: ZodSchema<any>) {
  return async function aiRequestMiddleware(req: Request, res: Response, next: NextFunction) {
    const validationResult = schema.safeParse(req.body)

    if (!validationResult.success) {
      res.status(400).json({ error: "Invalid input", details: validationResult.error.formErrors })
      return
    }

    const parsedInput = validationResult.data

    // Identify the user and fetch their session
    const user = await getConvexUser(req.headers.authorization)

    let session: Doc<"sessions"> | null = null

    // Authenticated users: lookup by userId
    if (user) {
      session = await convex.query(api.sessions.getByUserId, {
        userId: user._id,
      })
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
      }
    }

    if (!session) {
      res.status(401).json({ error: "No active session found. Please refresh the page and try again." })
      return
    }

    // Attach the session to the request for downstream handlers.
    req.session = session

    const modelId = parsedInput.chat?.modelId || parsedInput.agent?.modelId || parsedInput.workflow?.modelId

    if (!modelId) {
      res.status(400).json({ error: "Missing modelId in chat, agent, or workflow object." })
      return
    }

    // Determine the correct API key to use based on whether the user is authenticated
    // and whether the requested model requires a key.
    const requiresApiKey = getModelRequiresApiKey(modelId)
    let apiKeyToUse: string | undefined

    if (session.userId) {
      // User is authenticated: look up their specific API key.
      const apiKeyObject = (await convex.query(api.apiKeys.getApiKeyForUserAndModel, {
        userId: session.userId,
        modelId: modelId,
      })) as Doc<"apiKeys"> | null

      if (apiKeyObject) {
        apiKeyToUse = apiKeyObject.apiKey
      } else if (requiresApiKey) {
        res.status(400).json({ error: `API key for model '${modelId}' is missing or not configured.` })
        return
      } else {
        apiKeyToUse = getModelFallbackApiKey(modelId)
      }
    } else {
      // User is anonymous: they can only use models that don't require a key.
      if (requiresApiKey) {
        res.status(401).json({ error: "You must be logged in to use this model. Please log in and try again." })
        return
      }
      apiKeyToUse = getModelFallbackApiKey(modelId)
    }

    if (!apiKeyToUse) {
      res.status(400).json({ error: `API key for model '${modelId}' is missing or not configured.` })
      return
    }

    // Initialize the AI model instance and attach it to the request.
    const { data: modelInstance, error: modelError } = tryCatch(getModelInstance(modelId, apiKeyToUse))

    if (modelError || !modelInstance) {
      res.status(400).json({
        error: `Failed to initialize AI model '${modelId}'. Please check your API key and try again.`,
      })
      return
    }

    req.aiModel = modelInstance
    req.parsedInput = parsedInput

    // Pass control to the next middleware or route handler.
    next()
  }
}
