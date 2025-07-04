import { mcpConnectionManager } from "../../../services/mcp/connection-manager"
import { router, publicProcedure } from "../trpc"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { env } from "@dojo/env/backend"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

const isProduction = env.NODE_ENV === "production"

const connectInputSchema = z.object({
  servers: z.array(z.string()).min(1),
})

const disconnectInputSchema = z.object({
  serverId: z.string().min(1),
})

/**
 * Manages connections to MCP servers for both authenticated and anonymous users.
 * The session state is persisted in the Convex database.
 */
export const connectionRouter = router({
  /**
   * Establishes connections to one or more MCP servers. This is a public procedure,
   * but authorization is handled internally based on server properties.
   */
  connect: publicProcedure.input(connectInputSchema).mutation(async ({ input, ctx }) => {
    const { session, client } = ctx

    if (!session) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Session could not be established.",
      })
    }

    const { servers } = input
    const mcpServers = await Promise.all(
      servers.map((server) => client.query(api.mcp.get, { id: server as Id<"mcp"> })),
    )

    const validMcpServers = mcpServers.filter((s) => s !== null)

    try {
      const connectionPromises = validMcpServers.map(async (server) => {
        // Authorization: A user must be authenticated to connect to non-public servers.
        const isUserAuthenticated = !!session.userId
        if (!server.isPublic && !isUserAuthenticated) {
          throw new Error(`Authentication is required to connect to server "${server.name}".`)
        }

        // Additional check: Servers requiring user keys need authentication
        if (server.requiresUserKey && !isUserAuthenticated) {
          throw new Error(
            `Authentication is required to connect to server "${server.name}" as it requires API keys or configuration.`,
          )
        }

        if (server.localOnly && isProduction) {
          throw new Error(`Server "${server.name}" is local-only and cannot be accessed in a production environment.`)
        }

        // The connection process is a three-step dance:
        // 1. Clean up any lingering live connection from the in-memory cache.
        await mcpConnectionManager.cleanupConnection(session._id, server._id)

        // 2. Establish the new live connection, which adds it to the cache.
        const connection = await mcpConnectionManager.establishConnection(
          session._id,
          server,
          { connectionType: "user" }, // User-initiated connections
        )
        if (!connection?.success) {
          throw new Error(connection?.error || `Failed to establish connection with server "${server.name}".`)
        }

        return {
          serverId: server._id,
          success: true,
          tools: connection.client?.client.tools || {},
        }
      })

      const results = await Promise.all(connectionPromises)

      return { success: true, results }
    } catch (error) {
      // If any part of the connection process fails, we attempt to roll back
      // all changes made during this request to leave the system in a clean state.
      // This involves cleaning both the in-memory cache and the database.
      const cleanupPromises = validMcpServers.map(async (server) => {
        await mcpConnectionManager.cleanupConnection(session._id, server._id)
        // Connection cleanup is handled by cleanupExistingConnection
      })
      await Promise.allSettled(cleanupPromises)

      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred."
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Connection failed: ${errorMessage}. All connections have been rolled back.`,
        cause: error instanceof Error ? error : undefined,
      })
    }
  }),
  /**
   * Disconnects from a single MCP server.
   */
  disconnect: publicProcedure.input(disconnectInputSchema).mutation(async ({ input, ctx }) => {
    const { serverId } = input
    const { session } = ctx

    if (!session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No active session.",
      })
    }

    // Disconnecting is a two-step process:
    // 1. Clean up the live connection from the in-memory cache.
    await mcpConnectionManager.cleanupConnection(session._id, serverId as Id<"mcp">)

    // Connection is now tracked in mcpConnections table, no need to update session

    return { message: "Disconnection successful" }
  }),
})
