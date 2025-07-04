import { logger } from "./logger"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import type { ConvexHttpClient } from "convex/browser"

export interface SessionResult {
  session: Doc<"sessions"> | null
  error?: string
}

export interface SessionLookupParams {
  guestSessionId?: string | null
  client: ConvexHttpClient
}

/**
 * Core session lookup logic used by both Express and TRPC.
 * Handles both authenticated users and guest users.
 * @param params Session lookup parameters
 * @returns Promise<SessionResult> containing session data or error information
 */
export async function lookupSession(params: SessionLookupParams): Promise<SessionResult> {
  try {
    const { guestSessionId, client } = params

    // Try authenticated session first (returns null if not authenticated)
    let session = await client.query(api.sessions.getCurrentUserSession, {})

    // If no authenticated session, try guest session
    if (!session && guestSessionId) {
      session = await client.query(api.sessions.getByClientSessionId, {
        clientSessionId: guestSessionId,
      })
    }

    if (!session) {
      return {
        session: null,
        error: "No active session found. Please refresh the page and try again.",
      }
    }

    return { session }
  } catch (error) {
    logger.error("Session", "Error retrieving session", error)
    return {
      session: null,
      error: "Failed to retrieve session. Please try again.",
    }
  }
}
