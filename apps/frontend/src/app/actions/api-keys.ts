"use server"

import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { env } from "@dojo/env/frontend"
import { encryptApiKey, decryptApiKey } from "@dojo/utils"
import { fetchMutation } from "convex/nextjs"

/**
 * Server action to save an API key (encrypts it server-side)
 */
export async function saveApiKey(userId: Id<"users">, providerId: Id<"providers">, apiKey: string) {
  // Encrypt the API key on the server side using the server-only secret
  const encryptedApiKey = await encryptApiKey(apiKey, env.ENCRYPTION_SECRET)

  // Save to database
  const result = await fetchMutation(api.apiKeys.upsertApiKey, {
    apiKey: encryptedApiKey,
    userId,
    providerId,
  })

  return result
}

/**
 * Server action to remove an API key
 */
export async function removeApiKey(userId: Id<"users">, providerId: Id<"providers">) {
  const result = await fetchMutation(api.apiKeys.removeApiKey, {
    userId,
    providerId,
  })

  return result
}

/**
 * Server action to get decrypted API keys for display (returns masked versions)
 */
export async function getDecryptedApiKeys(userApiKeys: Array<{ providerId: Id<"providers">; apiKey: string }>) {
  const decryptedKeys: Record<Id<"providers">, string> = {}

  for (const key of userApiKeys) {
    if (key.apiKey) {
      // Decrypt the API key on the server side
      const decrypted = await decryptApiKey(key.apiKey, env.ENCRYPTION_SECRET)
      if (decrypted) {
        // Return masked version for security (show first 5 and last 4 characters)
        if (decrypted.length > 12) {
          decryptedKeys[key.providerId] = `${decrypted.slice(0, 5)}...${decrypted.slice(-4)}`
        } else {
          decryptedKeys[key.providerId] = `${decrypted.slice(0, 2)}...`
        }
      }
    }
  }

  return decryptedKeys
}

/**
 * Server action to validate if an API key has changed
 * (for checking if save button should be enabled)
 */
export async function hasApiKeyChanged(
  currentValue: string,
  encryptedStoredValue: string | undefined,
): Promise<boolean> {
  if (!encryptedStoredValue && !currentValue) return false
  if (!encryptedStoredValue && currentValue) return true
  if (encryptedStoredValue && !currentValue) return true

  if (encryptedStoredValue) {
    const decrypted = await decryptApiKey(encryptedStoredValue, env.ENCRYPTION_SECRET)
    return decrypted !== currentValue
  }

  return false
}
