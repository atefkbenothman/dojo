import { convex } from "../../convex-client.js"
import { establishMcpConnection, cleanupExistingConnection } from "../../mcp-connection.js"
import type { Context } from "../context.js"
import { router, protectedProcedure } from "../trpc.js"
import { api } from "@dojo/db/convex/_generated/api.js"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel.js"
import { asyncTryCatch } from "@dojo/utils"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

const isProduction = process.env.NODE_ENV === "production"

const connectInputSchema = z.object({
  servers: z.array(z.string()).min(1),
})

const disconnectInputSchema = z.object({
  serverId: z.string().min(1),
})

export const connectionRouter = router({
  connect: protectedProcedure
    .input(connectInputSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof connectInputSchema>; ctx: Context }) => {
      const { userSession } = ctx

      if (!userSession) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User session is required.",
        })
      }

      const { servers } = input

      const mcpServers = await Promise.all(
        servers.map((server) => convex.query(api.mcp.get, { id: server as Id<"mcp"> })),
      )

      const validMcpServers = mcpServers.filter((s) => s !== null)

      try {
        const connectionPromises = validMcpServers.map(async (server) => {
          if (server.localOnly && isProduction) {
            throw new Error(`Server "${server.name}" is local-only and cannot be accessed in a production environment.`)
          }

          await cleanupExistingConnection(userSession, server._id)
          const connection = await establishMcpConnection(userSession, server)

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

        return { success: true, userId: userSession.userId, results }
      } catch (error) {
        // rollback connections
        const cleanupPromises = validMcpServers.map((server) => cleanupExistingConnection(userSession, server._id))
        await Promise.allSettled(cleanupPromises)

        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred."
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Connection failed: ${errorMessage}. All connections have been rolled back.`,
          cause: error instanceof Error ? error : undefined,
        })
      }
    }),
  disconnect: protectedProcedure
    .input(disconnectInputSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof disconnectInputSchema>; ctx: Context }) => {
      const { serverId } = input
      const { userSession } = ctx

      if (!userSession) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User session is required.",
        })
      }

      const { error } = await asyncTryCatch(cleanupExistingConnection(userSession, serverId))

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to disconnect from server.",
          cause: error instanceof Error ? error : undefined,
        })
      }

      return { message: "Disconnection successful" }
    }),
})
