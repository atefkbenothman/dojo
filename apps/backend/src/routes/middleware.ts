import { getModelInstance, getModelRequiresApiKey, getModelFallbackApiKey } from "../ai/models.js"
import { getOrCreateUserSession } from "../session.js"
import { tryCatch } from "@dojo/utils"
import type { Request, Response, NextFunction } from "express"
import type { ZodSchema } from "zod"

export function createAiRequestMiddleware(schema: ZodSchema<any>) {
  return function aiRequestMiddleware(req: Request, res: Response, next: NextFunction) {
    const validationResult = schema.safeParse(req.body)

    if (!validationResult.success) {
      res.status(400).json({ error: "Invalid input", details: validationResult.error.formErrors })
      return
    }
    const parsedInput = validationResult.data

    const userId = req.headers["x-user-id"] as string | undefined
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      res.status(401).json({ error: "User ID is missing or invalid in X-User-Id header." })
      return
    }

    const userSession = getOrCreateUserSession(userId)
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

    let apiKeyToUse = parsedInput.apiKey

    if (!apiKeyToUse && requiresApiKey === false) {
      apiKeyToUse = getModelFallbackApiKey(modelId) || ""
    }

    if (!apiKeyToUse) {
      res.status(400).json({ error: "Missing API key." })
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
