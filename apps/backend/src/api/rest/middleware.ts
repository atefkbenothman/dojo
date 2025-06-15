import { getConvexUser } from "../../lib/auth"
import { convex } from "../../lib/convex-client"
import { getModelInstance, getModelRequiresApiKey, getModelFallbackApiKey } from "../../services/models"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { env } from "@dojo/env/backend"
import { tryCatch, decryptApiKey } from "@dojo/utils"
import type { Request, Response, NextFunction } from "express"
import type { ZodSchema } from "zod"

// Define the expected shape of parsed input
interface ParsedInputBase {
  chat?: { modelId: string }
  agent?: { modelId: string }
  workflow?: { modelId: string }
}

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
export function createAiRequestMiddleware<T extends ParsedInputBase>(schema: ZodSchema<T>) {
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
      const clientSessionId = Array.isArray(clientSessionIdHeader) ? clientSessionIdHeader[0] : clientSessionIdHeader

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
      // Note: modelId comes as a string from the input, but Convex expects Id<"models">
      // This is safe because getModelInstance will validate the modelId exists
      const apiKeyObject = await convex.query(api.apiKeys.getApiKeyForUserAndModel, {
        userId: session.userId,
        modelId: modelId as Id<"models">,
      })

      if (apiKeyObject) {
        // Decrypt the API key before using it
        const encryptionSecret = env.ENCRYPTION_SECRET
        if (!encryptionSecret) {
          res.status(500).json({ error: "Server configuration error: missing encryption secret." })
          return
        }

        const decryptedApiKey = await decryptApiKey(apiKeyObject.apiKey, encryptionSecret)
        if (!decryptedApiKey) {
          res.status(400).json({ error: "Failed to decrypt API key. Please re-enter your API key." })
          return
        }

        apiKeyToUse = decryptedApiKey
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
    const { data: modelInstance, error: modelError } = tryCatch(getModelInstance(modelId as Id<"models">, apiKeyToUse))

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
