import { convex } from "../../lib/convex-request-client"
import { throwError } from "../../lib/errors"
import { logger } from "../../lib/logger"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { env } from "@dojo/env/backend"
import { decryptApiKey } from "@dojo/utils"
import type { ConvexHttpClient } from "convex/browser"

export interface ApiKeyResult {
  apiKey: string
  source: "user" | "fallback"
}

export interface ApiKeyOptions {
  modelId: string
  client: ConvexHttpClient // Authenticated client for user operations
}

/**
 * Service for managing API key retrieval and validation
 */
export class ApiKeyService {
  private static readonly LOG_PREFIX = "[ApiKeyService]"

  /**
   * Retrieves the appropriate API key for a model and user
   * Handles both authenticated and guest users, with fallback keys for free models
   */
  async getApiKeyForModel(options: ApiKeyOptions): Promise<ApiKeyResult> {
    const { modelId, client } = options
    const requiresApiKey = await getModelRequiresApiKey(modelId)

    // Try to get user's specific API key (returns null if not authenticated or no key)
    const userApiKey = await this.getUserApiKey(client, modelId as Id<"models">)

    if (userApiKey) {
      return {
        apiKey: userApiKey,
        source: "user",
      }
    }

    // If no user API key but model requires one, check if user is authenticated
    if (requiresApiKey) {
      // Authenticated user but no API key for this model
      throwError(`API key for model '${modelId}' is missing or not configured`, 401)
    }

    // Try to use fallback API key (for free models)
    const fallbackKey = await getModelFallbackApiKey(modelId)
    if (!fallbackKey) {
      throwError(`API key for model '${modelId}' is missing or not configured`, 500)
    }

    return {
      apiKey: fallbackKey,
      source: "fallback",
    }
  }

  /**
   * Retrieves and decrypts a user's API key for a specific model using authenticated client
   */
  private async getUserApiKey(client: ConvexHttpClient, modelId: Id<"models">): Promise<string | null> {
    try {
      // Use the current user from the authenticated client's context
      const apiKeyObject = await client.query(api.apiKeys.getApiKeyForCurrentUserAndModel, {
        modelId,
      })

      if (!apiKeyObject) {
        return null
      }

      const encryptionSecret = env.ENCRYPTION_SECRET
      if (!encryptionSecret) {
        throwError("Server configuration error: missing encryption secret", 500)
      }

      const decryptedApiKey = await decryptApiKey(apiKeyObject.apiKey, encryptionSecret)
      if (!decryptedApiKey) {
        logger.error("ApiKey", `Failed to decrypt API key for model ${modelId}`)
        return null
      }

      return decryptedApiKey
    } catch (error) {
      logger.error("ApiKey", "Error retrieving user API key", error)
      if (error instanceof Error && error.message.includes("configuration")) {
        throw error // Re-throw configuration errors
      }
      return null
    }
  }

  /**
   * Validates that an API key exists and is properly formatted
   */
  static validateApiKey(apiKey: string, modelId: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throwError(`API key for model '${modelId}' is empty or invalid`, 500)
    }

    // Basic format validation (could be enhanced with provider-specific validation)
    if (apiKey.length < 10) {
      throwError(`API key for model '${modelId}' appears to be invalid (too short)`, 500)
    }
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService()

/**
 * Helper function to check if a model requires an API key
 */
export async function getModelRequiresApiKey(modelId: string): Promise<boolean> {
  try {
    const modelsWithProviders = await convex.query(api.models.modelsWithProviders)
    const model = modelsWithProviders.find((model) => model._id === modelId)
    if (!model || model.requiresApiKey === false) {
      return false
    }
    return true
  } catch (error) {
    logger.error("ApiKey", "Error checking if model requires API key", error)
    return true // Default to requiring API key for safety
  }
}

/**
 * Helper function to get fallback API key for models that don't require user API keys
 */
export async function getModelFallbackApiKey(modelId: string): Promise<string | undefined> {
  try {
    const modelsWithProviders = await convex.query(api.models.modelsWithProviders)
    const model = modelsWithProviders.find((model) => model._id === modelId)
    if (model && model.requiresApiKey === false) {
      return env.GROQ_API_KEY_FALLBACK || ""
    }
    return undefined
  } catch (error) {
    logger.error("ApiKey", "Error getting model fallback API key", error)
    return undefined
  }
}
