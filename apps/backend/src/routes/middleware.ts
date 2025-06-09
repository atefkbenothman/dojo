import { getModelInstance, getModelRequiresApiKey, getModelFallbackApiKey } from "../ai/models.js"
import { getConvexUser } from "../auth.js"
import { convex } from "../convex-client.js"
import { getOrCreateUserSession } from "../session.js"
import { api } from "@dojo/db/convex/_generated/api.js"
import type { Doc } from "@dojo/db/convex/_generated/dataModel.js"
import { tryCatch } from "@dojo/utils"
import type { Request, Response, NextFunction } from "express"
import type { ZodSchema } from "zod"

export function createAiRequestMiddleware(schema: ZodSchema<any>) {
  return async function aiRequestMiddleware(req: Request, res: Response, next: NextFunction) {
    const validationResult = schema.safeParse(req.body)

    if (!validationResult.success) {
      res.status(400).json({ error: "Invalid input", details: validationResult.error.formErrors })
      return
    }

    const parsedInput = validationResult.data

    const user = await getConvexUser(req.headers.authorization)
    if (!user) {
      res.status(401).json({ error: "Authentication failed. Invalid or missing token." })
      return
    }

    const userSession = getOrCreateUserSession(user._id)
    if (!userSession) {
      res.status(500).json({ error: "Failed to get or create user session." })
      return
    }

    const modelId = parsedInput.chat?.modelId || parsedInput.agent?.modelId || parsedInput.workflow?.modelId
    if (!modelId) {
      res.status(400).json({ error: "Missing modelId in chat, agent, or workflow object." })
      return
    }

    const requiresApiKey = getModelRequiresApiKey(modelId)

    let apiKeyToUse: string | undefined

    if (requiresApiKey) {
      // Get API key for user from Convex
      const apiKeyObject = (await convex.query(api.apiKeys.getApiKeyForUserAndModel, {
        userId: user._id,
        modelId: modelId,
      })) as Doc<"apiKeys"> | null

      if (apiKeyObject) {
        apiKeyToUse = apiKeyObject.apiKey
      }
    } else {
      apiKeyToUse = getModelFallbackApiKey(modelId)
    }

    if (!apiKeyToUse) {
      res.status(400).json({ error: `API key for model '${modelId}' is missing or not configured.` })
      return
    }

    const { data: modelInstance, error: modelError } = tryCatch(getModelInstance(modelId, apiKeyToUse))

    if (modelError || !modelInstance) {
      res.status(400).json({
        error: `Failed to initialize AI model '${modelId}'. Please check your API key and try again.`,
      })
      return
    }

    req.userSession = userSession
    req.aiModel = modelInstance
    req.parsedInput = parsedInput

    next()
  }
}
