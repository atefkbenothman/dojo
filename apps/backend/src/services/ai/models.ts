import { convex } from "../../lib/convex-client"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { env } from "@dojo/env/backend"
import { type LanguageModel, type ImageModel, wrapLanguageModel, extractReasoningMiddleware } from "ai"

const modelsWithProviders = await convex.query(api.models.modelsWithProviders)

// Create a cache for model instances to avoid re-creating them on every request.
const modelCache = new Map<string, LanguageModel | ImageModel>()

export function getModelInstance(modelId: Id<"models">, apiKey: string): LanguageModel | ImageModel {
  const cacheKey = `${modelId}:${apiKey}`

  // Return cached instance if available
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey)!
  }

  const model = modelsWithProviders.find((model) => model._id === modelId)

  if (!model) throw new Error(`Model with id '${modelId}' not found in shared configuration.`)
  if (!apiKey) throw new Error(`API key is required for model '${modelId}'.`)

  let newInstance: LanguageModel | ImageModel

  if (model.type === "text") {
    switch (model.provider?.providerId) {
      case "google":
        newInstance = wrapLanguageModel({
          model: createGoogleGenerativeAI({ apiKey })(model.modelId),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        })
        break
      case "groq":
        newInstance = wrapLanguageModel({
          model: createGroq({ apiKey })(model.modelId),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        })
        break
      default:
        throw new Error(`Unsupported provider '${model.provider?.providerId}' for text model '${modelId}'.`)
    }
  } else if (model.type === "image") {
    switch (model.provider?.providerId) {
      case "openai":
        newInstance = createOpenAI({ apiKey }).image(model.modelId)
        break
      default:
        throw new Error(`Unsupported provider '${model.provider?.providerId}' for image model '${modelId}'.`)
    }
  } else {
    throw new Error(`Unsupported model type for model '${modelId}'.`)
  }

  // Cache the new instance before returning
  modelCache.set(cacheKey, newInstance)
  console.log(`[AI] Caching new model instance for key: ${cacheKey.replace(apiKey, "********")}`)

  return newInstance
}

export function getModelRequiresApiKey(modelId: string): boolean {
  const model = modelsWithProviders.find((model) => model._id === modelId)
  if (!model || model.requiresApiKey === false) {
    return false
  }
  return true
}

export function getModelFallbackApiKey(modelId: string): string | undefined {
  const model = modelsWithProviders.find((model) => model._id === modelId)
  if (model && model.requiresApiKey === false) {
    return env.GROQ_API_KEY_FALLBACK || ""
  }
  return undefined
}
