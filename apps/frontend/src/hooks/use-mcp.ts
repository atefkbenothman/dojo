import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUserContext } from "@/hooks/use-user-id"
import { errorToastStyle } from "@/lib/styles"
import { useTRPCClient } from "@/lib/trpc/context"
import { useMCPStore } from "@/store/use-mcp-store"
import type { RouterOutputs } from "@dojo/backend/src/types.js"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { MCPServer } from "@dojo/db/convex/types"
import { useMutation } from "@tanstack/react-query"
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react"
import { WithoutSystemFields } from "convex/server"
import { useMemo } from "react"
import { toast } from "sonner"

export interface ActiveConnection {
  serverId: string
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<any, any>
}

export function useMCP() {
  const client = useTRPCClient()

  const mcpServers = useConvexQuery(api.mcp.list)
  const createMCP = useConvexMutation(api.mcp.create)
  const deleteMCP = useConvexMutation(api.mcp.remove)

  const { play } = useSoundEffectContext()
  const { userId, backendHealth } = useUserContext()

  const { connectionMeta, setConnectionStatus, setConnectionError, setConnectionMeta } = useMCPStore()

  const activeConnections = useMemo(() => {
    return Object.entries(connectionMeta)
      .filter(([_, m]) => m.status === "connected")
      .map(([serverId, m]) => ({
        serverId,
        name: m.name,
        tools: m.tools,
      }))
  }, [connectionMeta])

  function getConnectionStatus(serverId: string) {
    return connectionMeta[serverId]?.status ?? "disconnected"
  }

  function getConnectionError(serverId: string) {
    return connectionMeta[serverId]?.error ?? null
  }

  const connectMutation = useMutation<RouterOutputs["connection"]["connect"], Error, { serverIds: Id<"mcp">[] }>({
    mutationFn: async (variables: { serverIds: Id<"mcp">[] }) => {
      return client.connection.connect.mutate({ servers: variables.serverIds })
    },
    onMutate: (variables: { serverIds: Id<"mcp">[] }) => {
      const { serverIds } = variables
      serverIds.forEach((serverId) => {
        setConnectionStatus(serverId, "connecting")
        setConnectionError(serverId, null)
        setConnectionMeta(serverId, { name: serverId })
      })
    },
    onSuccess: (data: RouterOutputs["connection"]["connect"], variables: { serverIds: Id<"mcp">[] }) => {
      const { serverIds } = variables
      serverIds.forEach((serverId) => {
        const result = data.results.find((r) => r.serverId === serverId)
        if (result?.success) {
          setConnectionStatus(serverId, "connected")
          setConnectionError(serverId, null)
          setConnectionMeta(serverId, { name: serverId, tools: result.tools || {} })
          play("./sounds/connect.mp3", { volume: 0.5 })
        } else {
          const errorMsg =
            result && "error" in result && typeof result.error === "string" ? result.error : "Connection failed"
          setConnectionStatus(serverId, "error")
          setConnectionError(serverId, errorMsg)
          play("./sounds/error.mp3", { volume: 0.5 })
          toast.error(errorMsg, {
            icon: null,
            id: `mcp-error-${serverId}`,
            duration: 5000,
            position: "bottom-center",
            style: errorToastStyle,
          })
        }
      })
    },
    onError: (error: Error, variables: { serverIds: Id<"mcp">[] }) => {
      const { serverIds } = variables
      serverIds.forEach((serverId) => {
        setConnectionStatus(serverId, "error")
        setConnectionError(serverId, error.message || "An unexpected error occurred during connecting")
        play("./sounds/error.mp3", { volume: 0.5 })
        toast.error(error.message, {
          icon: null,
          id: `mcp-error-${serverId}`,
          duration: 5000,
          position: "bottom-center",
          style: errorToastStyle,
        })
      })
    },
  })

  const disconnectMutation = useMutation<{ message: string }, Error, { serverId: string }>({
    mutationFn: async (variables: { serverId: string }) => {
      return client.connection.disconnect.mutate({ serverId: variables.serverId })
    },
    onMutate: (variables: { serverId: string }) => {
      const { serverId } = variables
      setConnectionStatus(serverId, "disconnected")
    },
    onSuccess: (_data: { message: string }, variables: { serverId: string }) => {
      const { serverId } = variables
      setConnectionError(serverId, null)
    },
    onError: (error: Error, variables: { serverId: string }) => {
      const { serverId } = variables
      setConnectionStatus(serverId, "error")
      setConnectionError(serverId, error.message || "Disconnection failed")
    },
  })

  const connect = async (serverIds: Id<"mcp">[]) => {
    if (serverIds.some((serverId) => connectionMeta[serverId]?.status === "connecting")) return
    if (!userId) {
      play("./sounds/error.mp3", { volume: 0.5 })
      toast.error("User ID not available in context", {
        icon: null,
        id: "mcp-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      return
    }
    if (!backendHealth) {
      play("./sounds/error.mp3", { volume: 0.5 })
      toast.error("Server is offline", {
        icon: null,
        id: "mcp-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      return
    }
    // use promise.all to connect to all MCP servers at once
    await Promise.all(serverIds.map((serverId) => connectMutation.mutateAsync({ serverIds: [serverId] })))
  }

  const disconnect = async (serverId: string) => {
    if (!userId) {
      play("./sounds/error.mp3", { volume: 0.5 })
      toast.error("User ID not available in context", {
        icon: null,
        id: "mcp-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      return
    }
    await disconnectMutation.mutateAsync({ serverId })
    play("./sounds/disconnect.mp3", { volume: 0.5 })
  }

  const disconnectAll = async () => {
    if (!userId || activeConnections.length === 0) return
    await Promise.all(activeConnections.map((conn) => disconnect(conn.serverId)))
    play("./sounds/disconnect.mp3", { volume: 0.5 })
  }

  const create = async (mcp: WithoutSystemFields<Doc<"mcp">>) => {
    await createMCP(mcp)
  }

  const remove = async (id: string) => {
    await deleteMCP({ id: id as Id<"mcp"> })
  }

  const stableMcpServers = useMemo(() => mcpServers || [], [mcpServers])

  return {
    mcpServers: stableMcpServers,
    activeConnections,
    getConnectionStatus,
    getConnectionError,
    connect,
    disconnect,
    disconnectAll,
    create,
    remove,
  }
}
