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

// The primary function for getting or creating a session.
// Handles authenticated users, guest users, and the transition between them.
export const getOrCreate = mutation({
  args: {
    userId: v.optional(v.id("users")),
    guestSessionId: v.optional(v.id("sessions")), // The ID of a potential anonymous session
  },
  handler: async (ctx, { userId, guestSessionId }) => {
    // Case 1: Authenticated User
    if (userId) {
      // Try to find a session linked to this user.
      const existingUserSession = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique()

      // If the user logs in and they had a previous guest session, merge them.
      if (guestSessionId) {
        const guestSession = await ctx.db.get(guestSessionId)
        if (guestSession) {
          if (existingUserSession) {
            // Merge guest connections into the user's existing session
            const combinedConnections = [...existingUserSession.activeMcpServerIds, ...guestSession.activeMcpServerIds]
            // Use a Set to remove duplicates
            const uniqueConnections = [...new Set(combinedConnections)]
            await ctx.db.patch(existingUserSession._id, {
              activeMcpServerIds: uniqueConnections,
              lastAccessed: Date.now(),
            })
            await ctx.db.delete(guestSession._id) // Delete the old guest session
            return await ctx.db.get(existingUserSession._id)
          } else {
            // No existing user session, so we "claim" the guest session.
            await ctx.db.patch(guestSessionId, {
              userId: userId,
              lastAccessed: Date.now(),
            })
            return await ctx.db.get(guestSessionId)
          }
        }
      }

      // If we found a session for the user, return it.
      if (existingUserSession) {
        await ctx.db.patch(existingUserSession._id, { lastAccessed: Date.now() })
        return existingUserSession
      }

      // No existing session for this user, create a new one.
      const newSessionId = await ctx.db.insert("sessions", {
        userId: userId,
        activeMcpServerIds: [],
        lastAccessed: Date.now(),
      })
      return await ctx.db.get(newSessionId)
    }

    // Case 2: Anonymous Guest User
    if (guestSessionId) {
      const guestSession = await ctx.db.get(guestSessionId)
      if (guestSession) {
        // Found the guest session, update its timestamp and return it.
        await ctx.db.patch(guestSession._id, { lastAccessed: Date.now() })
        return guestSession
      }
    }

    // Case 3: New Anonymous User (no valid userId or guestSessionId)
    // Create a brand new session document.
    const newGuestSessionId = await ctx.db.insert("sessions", {
      activeMcpServerIds: [],
      lastAccessed: Date.now(),
    })
    return await ctx.db.get(newGuestSessionId)
  },
})

// Adds an MCP server connection to a session
export const addConnection = mutation({
  args: {
    sessionId: v.id("sessions"),
    mcpServerId: v.id("mcp"),
  },
  handler: async (ctx, { sessionId, mcpServerId }) => {
    const session = await ctx.db.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    // Avoid duplicates
    if (session.activeMcpServerIds.includes(mcpServerId)) {
      return session
    }
    await ctx.db.patch(sessionId, {
      activeMcpServerIds: [...session.activeMcpServerIds, mcpServerId],
      lastAccessed: Date.now(),
    })
    return await ctx.db.get(sessionId)
  },
})

// Removes an MCP server connection from a session
export const removeConnection = mutation({
  args: {
    sessionId: v.id("sessions"),
    mcpServerId: v.id("mcp"),
  },
  handler: async (ctx, { sessionId, mcpServerId }) => {
    const session = await ctx.db.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    await ctx.db.patch(sessionId, {
      activeMcpServerIds: session.activeMcpServerIds.filter((id) => id !== mcpServerId),
      lastAccessed: Date.now(),
    })
    return await ctx.db.get(sessionId)
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
          // It's an anonymous session (no user ID)
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
