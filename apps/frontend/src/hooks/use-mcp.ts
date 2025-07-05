import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { errorToastStyle, successToastStyle } from "@/lib/styles"
import { useTRPCClient } from "@/lib/trpc/context"
import { useSession } from "@/providers/session-provider"
import { useMCPStore } from "@/store/use-mcp-store"
import type { RouterOutputs } from "@dojo/backend/src/lib/types"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { MCPToolsCollection } from "@dojo/db/convex/types"
import { useMutation } from "@tanstack/react-query"
import { useMutation as useConvexMutation, useQuery as useConvexQuery, useConvex } from "convex/react"
import { WithoutSystemFields } from "convex/server"
import { useMemo } from "react"
import { toast } from "sonner"

// Connection status constants
export const MCP_CONNECTION_STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTING: "disconnecting",
  DISCONNECTED: "disconnected",
  ERROR: "error",
} as const

export type MCPConnectionStatus = (typeof MCP_CONNECTION_STATUS)[keyof typeof MCP_CONNECTION_STATUS]

// Connection state interface
export interface MCPConnectionState {
  status: MCPConnectionStatus
  error?: string
  isStale?: boolean
  statusUpdatedAt?: number
}

// Utility functions
export const isMCPConnected = (state?: MCPConnectionState | null): boolean => {
  return state?.status === MCP_CONNECTION_STATUS.CONNECTED && !state?.isStale
}

export const isMCPConnecting = (state?: MCPConnectionState | null): boolean => {
  return state?.status === MCP_CONNECTION_STATUS.CONNECTING
}

export const isMCPError = (state?: MCPConnectionState | null): boolean => {
  return state?.status === MCP_CONNECTION_STATUS.ERROR || !!state?.isStale
}

export const canConnectMCP = (
  server: Doc<"mcp">,
  isAuthenticated: boolean,
  connectionState?: MCPConnectionState | null,
): boolean => {
  // Can't connect if already connected or connecting
  if (isMCPConnected(connectionState) || isMCPConnecting(connectionState)) return false

  // Can't connect local servers in production
  if (server.localOnly && process.env.NODE_ENV === "production") return false

  // Can't connect servers requiring keys without authentication
  if (!isAuthenticated && server.requiresUserKey) return false

  return true
}

export interface ActiveConnection {
  serverId: string
  name: string
  tools: MCPToolsCollection
}

export function useMCP() {
  const convex = useConvex()
  const client = useTRPCClient()
  const { currentSession } = useSession()

  // Simple store for tools data only
  const { tools, setTools, clearTools } = useMCPStore()

  const mcpServers = useConvexQuery(api.mcp.list)
  const createMCP = useConvexMutation(api.mcp.create)
  const editMCP = useConvexMutation(api.mcp.edit)
  const deleteMCP = useConvexMutation(api.mcp.remove)
  const cloneMCP = useConvexMutation(api.mcp.clone)

  // Query MCP connections from Convex
  const mcpConnections = useConvexQuery(
    api.mcpConnections.getBySession,
    currentSession ? { sessionId: currentSession._id } : "skip",
  )

  const { play } = useSoundEffectContext()

  // Get active connections from Convex data
  const activeConnections = useMemo(() => {
    if (!mcpConnections || !mcpServers) return []

    return mcpConnections
      .filter((conn) => conn.status === "connected")
      .map((conn) => {
        const server = mcpServers.find((s) => s._id === conn.mcpServerId)
        return {
          serverId: conn.mcpServerId,
          name: server?.name || conn.mcpServerId,
          tools: tools[conn.mcpServerId] || {}, // Get tools from simplified store
        }
      })
  }, [mcpConnections, mcpServers, tools])

  // Get connection data from Convex
  const getConnection = (serverId: string) => {
    if (!mcpConnections) return null
    return mcpConnections.find((c) => c.mcpServerId === serverId) || null
  }

  const connectMutation = useMutation<RouterOutputs["connection"]["connect"], Error, { serverIds: Id<"mcp">[] }>({
    mutationFn: async (variables: { serverIds: Id<"mcp">[] }) => {
      return client.connection.connect.mutate({ servers: variables.serverIds })
    },
    onSuccess: (data: RouterOutputs["connection"]["connect"], variables: { serverIds: Id<"mcp">[] }) => {
      const { serverIds } = variables
      serverIds.forEach((serverId) => {
        const result = data.results.find((r) => r.serverId === serverId)
        if (result?.success) {
          // Store tools in simplified store
          setTools(serverId, result.tools || {})
          play("./sounds/connect.mp3", { volume: 0.5 })
        } else {
          play("./sounds/error.mp3", { volume: 0.5 })
          toast.error("Failed to connect to server", {
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
    onSuccess: (_data: { message: string }, variables: { serverId: string }) => {
      const { serverId } = variables
      // Clear tools from store
      clearTools(serverId)
    },
  })

  const connect = async (serverIds: Id<"mcp">[]) => {
    // Check if session is ready before attempting connection
    if (!currentSession) {
      toast.error("Session not ready. Please wait a moment and try again.", {
        icon: null,
        id: "mcp-session-not-ready",
        duration: 3000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      return
    }

    // Check if already connecting using Convex data
    const connectingServers = serverIds.filter((serverId) => {
      const conn = getConnection(serverId)
      return conn?.status === "connecting"
    })
    if (connectingServers.length > 0) return

    await Promise.all(serverIds.map((serverId) => connectMutation.mutateAsync({ serverIds: [serverId] })))
  }

  const disconnect = async (serverId: string) => {
    await disconnectMutation.mutateAsync({ serverId })
    play("./sounds/disconnect.mp3", { volume: 0.5 })
  }

  const create = async (mcp: WithoutSystemFields<Doc<"mcp">>) => {
    try {
      const serverId = await createMCP(mcp)
      return serverId
    } catch (error) {
      play("./sounds/error.mp3", { volume: 0.5 })
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error(`Failed to create server: ${errorMessage}`, {
        icon: null,
        id: "create-mcp-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      throw error
    }
  }

  const edit = async (mcp: { id: Id<"mcp"> } & WithoutSystemFields<Doc<"mcp">>) => {
    try {
      await editMCP(mcp)
    } catch (error) {
      play("./sounds/error.mp3", { volume: 0.5 })
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error(`Failed to save server: ${errorMessage}`, {
        icon: null,
        id: "edit-mcp-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      throw error
    }
  }

  const remove = async (id: string, force?: boolean) => {
    try {
      await deleteMCP({ id: id as Id<"mcp">, force })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      play("./sounds/error.mp3", { volume: 0.5 })
      toast.error(`Failed to remove server: ${errorMessage}`, {
        icon: null,
        id: "remove-mcp-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      throw error
    }
  }

  const checkServerDependencies = async (id: string) => {
    try {
      return await convex.query(api.mcp.checkDependencies, { id: id as Id<"mcp"> })
    } catch (error) {
      console.error("Failed to check dependencies:", error)
      return null
    }
  }

  const clone = async (id: string) => {
    try {
      await cloneMCP({ id: id as Id<"mcp"> })
      play("./sounds/connect.mp3", { volume: 0.5 })
      toast.success("Server cloned successfully!", {
        icon: null,
        id: "clone-mcp-success",
        duration: 3000,
        position: "bottom-center",
        style: successToastStyle,
      })
    } catch (error) {
      play("./sounds/error.mp3", { volume: 0.5 })
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error(`Failed to clone server: ${errorMessage}`, {
        icon: null,
        id: "clone-mcp-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      throw error
    }
  }

  const stableMcpServers = useMemo(() => mcpServers || [], [mcpServers])

  return {
    mcpServers: stableMcpServers,
    activeConnections,
    getConnection,
    connect,
    disconnect,
    create,
    edit,
    remove,
    clone,
    checkServerDependencies,
  }
}
