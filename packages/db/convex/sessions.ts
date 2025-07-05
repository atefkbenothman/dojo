import { internalMutation, mutation, query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import { Id } from "./_generated/dataModel"

// Helper to get current userId from auth context
async function getCurrentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return identity.subject.split("|")[0] as Id<"users">
}

const STALE_THRESHOLD = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Retrieves a session by its ID
export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId)
  },
})

// Retrieves the current authenticated user's session
export const getCurrentUserSession = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null
    
    return await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique()
  },
})


// Retrieves a session by clientSessionId
export const getByClientSessionId = query({
  args: { clientSessionId: v.string() },
  handler: async (ctx, { clientSessionId }) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_clientSessionId", (q) => q.eq("clientSessionId", clientSessionId))
      .unique()
  },
})

// Get or create session for authenticated users or guests
// For authenticated users: automatically uses auth context
// For guests: requires clientSessionId
export const getOrCreate = mutation({
  args: {
    clientSessionId: v.optional(v.string()), // Required for guests only
  },
  handler: async (ctx, { clientSessionId }) => {
    // Check if user is authenticated
    const userId = await getCurrentUserId(ctx)
    
    // Authenticated User Flow
    if (userId) {
      // Find existing session for this user
      const existingSession = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique()

      if (existingSession) {
        // Return existing session without updating lastAccessed to avoid unnecessary re-renders
        return existingSession
      }

      // Create new session for authenticated user
      const newSessionId = await ctx.db.insert("sessions", {
        userId,
        lastAccessed: Date.now(),
      })
      return await ctx.db.get(newSessionId)
    }

    // Guest User Flow
    if (clientSessionId) {
      // Find existing session by clientSessionId
      const existingSession = await ctx.db
        .query("sessions")
        .withIndex("by_clientSessionId", (q) => q.eq("clientSessionId", clientSessionId))
        .unique()

      if (existingSession) {
        // Return existing session without updating lastAccessed to avoid unnecessary re-renders
        return existingSession
      }

      // Create new guest session
      const newSessionId = await ctx.db.insert("sessions", {
        clientSessionId,
        lastAccessed: Date.now(),
      })
      return await ctx.db.get(newSessionId)
    }

    throw new Error("Guest users must provide clientSessionId")
  },
})

// Internal function for a cron job to clean up stale, anonymous sessions
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const staleSessions = await ctx.db
      .query("sessions")
      .filter((q) =>
        q.and(
          // It's a guest session (has clientSessionId but no userId)
          q.eq(q.field("userId"), undefined),
          // And it hasn't been accessed in over the stale threshold
          q.lt(q.field("lastAccessed"), Date.now() - STALE_THRESHOLD),
        ),
      )
      .collect()

    // Delete all the stale sessions
    await Promise.all(staleSessions.map((session) => ctx.db.delete(session._id)))
  },
})
