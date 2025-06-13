/**
 * Crypto utilities for encrypting/decrypting API keys
 * Uses Web Crypto API which is available in both browser and Node.js environments
 */

/**
 * Derives an encryption key from a master secret
 */
async function deriveKey(masterSecret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(masterSecret), { name: "PBKDF2" }, false, [
    "deriveKey",
  ])

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("dojo-api-keys"), // Static salt for simplicity
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/**
 * Encrypts an API key using AES-GCM
 */
export async function encryptApiKey(apiKey: string, masterSecret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await deriveKey(masterSecret)

  // Generate a random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(apiKey))

  // Combine IV and encrypted data, then encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypts an API key using AES-GCM
 * Returns undefined if decryption fails
 */
export async function decryptApiKey(encryptedApiKey: string, masterSecret: string): Promise<string | undefined> {
  try {
    const decoder = new TextDecoder()
    const key = await deriveKey(masterSecret)

    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedApiKey)
        .split("")
        .map((char) => char.charCodeAt(0)),
    )

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted)

    return decoder.decode(decrypted)
  } catch {
    // Return undefined on any decryption failure
    return undefined
  }
}
