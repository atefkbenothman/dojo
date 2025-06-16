import { internalMutation, mutation, query } from "./_generated/server"
import { v } from "convex/values"

const STALE_THRESHOLD = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Retrieves a session by its ID
export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId)
  },
})

// Retrieves a session by userId
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
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

// The primary function for getting or creating a session.
// Handles authenticated users and guest users separately - no merging.
export const getOrCreate = mutation({
  args: {
    userId: v.optional(v.id("users")),
    clientSessionId: v.optional(v.string()), // Frontend-generated UUID for guests
  },
  handler: async (ctx, { userId, clientSessionId }) => {
    // Authenticated User Flow
    if (userId) {
      // Find existing session for this user
      const existingSession = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique()

      if (existingSession) {
        // Update last accessed time
        await ctx.db.patch(existingSession._id, { lastAccessed: Date.now() })
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
        // Update last accessed time
        await ctx.db.patch(existingSession._id, { lastAccessed: Date.now() })
        return existingSession
      }

      // Create new guest session
      const newSessionId = await ctx.db.insert("sessions", {
        clientSessionId,
        lastAccessed: Date.now(),
      })
      return await ctx.db.get(newSessionId)
    }

    throw new Error("Either userId or clientSessionId must be provided")
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
