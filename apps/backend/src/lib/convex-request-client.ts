import { ConvexHttpClient } from "convex/browser"
import { env } from "@dojo/env/backend"

if (!env.CONVEX_URL) {
  throw new Error("CONVEX_URL is not set")
}

/**
 * Creates a new Convex client instance for a specific request.
 * This ensures proper isolation between concurrent requests and prevents
 * authentication state from leaking between requests.
 * 
 * @param authToken Optional authentication token to set on the client
 * @returns A new ConvexHttpClient instance
 */
export function createRequestClient(authToken?: string): ConvexHttpClient {
  const client = new ConvexHttpClient(env.CONVEX_URL)
  
  if (authToken) {
    client.setAuth(authToken)
  }
  
  return client
}

/**
 * Creates a new Convex client instance from an Authorization header.
 * Extracts the Bearer token and sets it on the client.
 * 
 * @param authorization The Authorization header value
 * @returns A new ConvexHttpClient instance with auth set if valid token provided
 */
export function createClientFromAuth(authorization?: string): ConvexHttpClient {
  const client = new ConvexHttpClient(env.CONVEX_URL)
  
  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.substring(7)
    client.setAuth(token)
  }
  
  return client
}

// Re-export the singleton client for system-level operations
// This should ONLY be used for operations that don't require user context
export { convex as systemConvexClient } from "./convex-client"