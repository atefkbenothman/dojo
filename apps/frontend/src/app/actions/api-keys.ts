"use server"

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { env } from "@dojo/env/frontend"
import { encryptApiKey, decryptApiKey } from "@dojo/utils"
import { fetchMutation } from "convex/nextjs"

/**
 * Server action to save an API key (encrypts it server-side)
 * Note: userId is extracted from auth context in the mutation
 */
export async function saveApiKey(providerId: Id<"providers">, apiKey: string) {
  // Get the auth token for the current user
  const token = await convexAuthNextjsToken()
  
  // Encrypt the API key on the server side using the server-only secret
  const encryptedApiKey = await encryptApiKey(apiKey, env.ENCRYPTION_SECRET)

  // Save to database with auth token
  const result = await fetchMutation(api.apiKeys.upsertApiKey, {
    apiKey: encryptedApiKey,
    providerId,
  }, { token })

  return result
}

/**
 * Server action to remove an API key
 * Note: userId is extracted from auth context in the mutation
 */
export async function removeApiKey(providerId: Id<"providers">) {
  // Get the auth token for the current user
  const token = await convexAuthNextjsToken()
  
  const result = await fetchMutation(api.apiKeys.removeApiKey, {
    providerId,
  }, { token })

  return result
}

/**
 * Server action to get decrypted API keys for display
 */
export async function getDecryptedApiKeys(userApiKeys: Array<{ providerId: Id<"providers">; apiKey: string }>) {
  const decryptedKeys: Record<Id<"providers">, string> = {}

  for (const key of userApiKeys) {
    if (key.apiKey) {
      // Decrypt the API key on the server side
      const decrypted = await decryptApiKey(key.apiKey, env.ENCRYPTION_SECRET)
      if (decrypted) {
        decryptedKeys[key.providerId] = decrypted
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
