import { establishMcpConnection, cleanupExistingConnection } from "../../mcp-connection.js"
import type { Context } from "../context.js"
import { connectInputSchema, disconnectInputSchema } from "../schemas.js"
import { router, protectedProcedure } from "../trpc.js"
import { asyncTryCatch } from "@dojo/utils"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

export const connectionRouter = router({
  connect: protectedProcedure
    .input(connectInputSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof connectInputSchema>; ctx: Context }) => {
      const { servers } = input
      const { userSession } = ctx

      if (!userSession) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User session is required.",
        })
      }

      const isProduction = process.env.NODE_ENV === "production"

      const results = []

      for (const server of servers) {
        if (server.localOnly && isProduction) {
          results.push({
            serverId: server.id,
            success: false,
            error: "This is a local-only MCP server and cannot be accessed in the current environment.",
            tools: {},
          })
          continue
        }

        const { error: cleanupError } = await asyncTryCatch(cleanupExistingConnection(userSession, server.id))

        if (cleanupError) {
          results.push({
            serverId: server.id,
            success: false,
            error: "An unexpected error occurred while cleaning up the connection.",
            tools: {},
          })
          continue
        }

        const { data: connection, error: connectionError } = await asyncTryCatch(
          establishMcpConnection(userSession, server),
        )

        if (connectionError) {
          results.push({
            serverId: server.id,
            success: false,
            error: "An unexpected error occurred while establishing the connection.",
            tools: {},
          })
          continue
        }

        if (!connection || !connection.success) {
          const errorMessage = connection?.error || "Failed to establish connection with MCP server."
          results.push({
            serverId: server.id,
            success: false,
            error: errorMessage,
            tools: {},
          })
          continue
        }

        const tools = connection.client?.client.tools || {}
        results.push({
          serverId: server.id,
          success: true,
          tools,
        })
      }

      return { success: results.every((r) => r.success), userId: userSession.userId, results }
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
