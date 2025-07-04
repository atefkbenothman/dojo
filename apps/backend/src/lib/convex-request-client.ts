import { env } from "@dojo/env/backend"
import { ConvexHttpClient } from "convex/browser"

if (!env.CONVEX_URL) {
  throw new Error("CONVEX_URL is not set")
}

// Singleton client for system-level operations
export const convex = new ConvexHttpClient(env.CONVEX_URL)

/**
 * Creates a new Convex client instance for a specific request.
 * This ensures proper isolation between concurrent requests and prevents
 * authentication state from leaking between requests.
 *
 * @param authorization The Authorization header value (e.g., "Bearer <token>")
 * @returns A new ConvexHttpClient instance with auth set if valid token provided
 */
export function createRequestClient(authorization?: string): ConvexHttpClient {
  const client = new ConvexHttpClient(env.CONVEX_URL)

  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.substring(7)
    client.setAuth(token)
  }

  return client
}
