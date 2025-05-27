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
      const { server } = input
      const { userSession } = ctx

      if (!userSession) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User session is required.",
        })
      }

      const isProduction = process.env.NODE_ENV === "production"

      if (server.localOnly && isProduction) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This is a local-only MCP server and cannot be accessed in the current environment.",
        })
      }

      const { error: cleanupError } = await asyncTryCatch(cleanupExistingConnection(userSession, server.id))

      if (cleanupError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while cleaning up the connection.",
          cause: cleanupError instanceof Error ? cleanupError : undefined,
        })
      }

      const { data: connection, error: connectionError } = await asyncTryCatch(
        establishMcpConnection(userSession, server),
      )

      if (connectionError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while establishing the connection.",
          cause: connectionError,
        })
      }

      if (!connection || !connection.success) {
        const errorMessage = connection?.error || "Failed to establish connection with MCP server."
        const trpcErrorCode = connection?.error?.includes("limit reached")
          ? "TOO_MANY_REQUESTS"
          : "INTERNAL_SERVER_ERROR"
        throw new TRPCError({ code: trpcErrorCode, message: errorMessage })
      }

      const tools = connection.client?.client.tools || {}

      return { success: true, userId: userSession.userId, serverId: server.id, tools }
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
