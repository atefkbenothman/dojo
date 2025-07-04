import { convex } from "../../lib/convex-request-client"
import { throwError } from "../../lib/errors"
import { apiKeyService, ApiKeyService } from "../api-key/api-key-service"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { createPerplexity } from "@ai-sdk/perplexity"
import { api } from "@dojo/db/convex/_generated/api"
import { AIModelWithProvider } from "@dojo/db/convex/types"
import { type LanguageModel, type ImageModel, wrapLanguageModel, extractReasoningMiddleware } from "ai"
import type { ConvexHttpClient } from "convex/browser"

export class ModelManager {
  private modelCache = new Map<string, LanguageModel | ImageModel>()
  private modelsConfig: AIModelWithProvider | null = null

  async getModel(modelId: string, client: ConvexHttpClient): Promise<LanguageModel | ImageModel> {
    // Get API key for the model
    const apiKeyResult = await apiKeyService.getApiKeyForModel({
      modelId,
      client,
    })

    // Validate the API key
    ApiKeyService.validateApiKey(apiKeyResult.apiKey, modelId)

    // Create cache key
    const cacheKey = `${modelId}:${apiKeyResult.apiKey}`

    // Check cache first
    const cachedModel = this.modelCache.get(cacheKey)

    if (cachedModel) {
      return cachedModel
    }

    // Load models config if not already loaded
    if (!this.modelsConfig) {
      this.modelsConfig = await convex.query(api.models.modelsWithProviders)
    }

    // Create new model instance
    const model = this.createModelInstance(modelId, apiKeyResult.apiKey)

    // Cache it
    this.modelCache.set(cacheKey, model)

    return model
  }

  private createModelInstance(modelId: string, apiKey: string): LanguageModel | ImageModel {
    if (!this.modelsConfig) {
      throwError("Models configuration not loaded")
    }

    const model = this.modelsConfig.find((m) => m._id === modelId)
    if (!model) {
      throwError(`Model with id '${modelId}' not found in configuration`)
    }

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
        case "anthropic":
          return wrapLanguageModel({
            model: createAnthropic({ apiKey })(model.modelId),
            middleware: extractReasoningMiddleware({ tagName: "think" }),
          })
        case "perplexity":
          return wrapLanguageModel({
            model: createPerplexity({ apiKey })(model.modelId),
            middleware: extractReasoningMiddleware({ tagName: "think" }),
          })
        default:
          throwError(`Unsupported provider '${model.provider?.providerId}' for text model '${modelId}'`)
      }
    } else if (model.type === "image") {
      switch (model.provider?.providerId) {
        case "openai":
          return createOpenAI({ apiKey }).image(model.modelId)
        default:
          throwError(`Unsupported provider '${model.provider?.providerId}' for image model '${modelId}'`)
      }
    } else {
      throwError(`Unsupported model type for model '${modelId}'`)
    }
  }
}

export const modelManager = new ModelManager()
