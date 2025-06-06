import { convex } from "../convex-client.js"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { api } from "@dojo/db/convex/_generated/api.js"
import { type LanguageModel, type ImageModel, wrapLanguageModel, extractReasoningMiddleware } from "ai"
import "dotenv/config"

const modelsWithProviders = await convex.query(api.models.modelsWithProviders)

export function getModelInstance(modelId: string, apiKey: string): LanguageModel | ImageModel {
  const model = modelsWithProviders.find((model) => model._id === modelId)

  if (!model) throw new Error(`Model with id '${modelId}' not found in shared configuration.`)
  if (!apiKey) throw new Error(`API key is required for model '${modelId}'.`)

  if (model.type === "text") {
    switch (model.provider?.providerId) {
      case "google":
        return wrapLanguageModel({
          model: createGoogleGenerativeAI({ apiKey })(model.modelId),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        })
      case "groq":
        return wrapLanguageModel({
          model: createGroq({ apiKey })(model.modelId),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        })
      default:
        throw new Error(`Unsupported provider '${model.providerId}' for text model '${modelId}'.`)
    }
  }

  if (model.type === "image") {
    switch (model.provider?.providerId) {
      case "openai":
        return createOpenAI({ apiKey }).image(model.modelId)
      default:
        throw new Error(`Unsupported provider '${model.providerId}' for image model '${modelId}'.`)
    }
  }

  throw new Error(`Unsupported model type for model '${modelId}'.`)
}

export function getModelRequiresApiKey(modelId: string): boolean | undefined {
  const model = modelsWithProviders.find((model) => model._id === modelId)
  return model?.requiresApiKey
}

export function getModelFallbackApiKey(modelId: string): string | undefined {
  const model = modelsWithProviders.find((model) => model._id === modelId)
  if (model && model.requiresApiKey === false) {
    return process.env.GROQ_API_KEY_FALLBACK || ""
  }
  return undefined
}
