"use client"

import { env } from "@/env"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUserContext } from "@/hooks/use-user-id"
import { errorToastStyle } from "@/lib/styles"
import { useTRPCClient } from "@/lib/trpc/context"
import type { RouterOutputs } from "@dojo/backend/src/types.js"
import type { MCPServer } from "@dojo/config"
import { useMutation } from "@tanstack/react-query"
import { useState, createContext, useContext, useCallback } from "react"
import { useMemo } from "react"
import { toast } from "sonner"

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export interface ActiveConnection {
  serverId: string
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<any, any>
}

function useMCP(mcpServers: Record<string, MCPServer>, isServerHealthy: boolean) {
  const client = useTRPCClient()
  const userId = useUserContext()
  const { play } = useSoundEffectContext()
  const { readStorage, writeStorage, removeStorage } = useLocalStorage()

  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({})
  const [connectionError, setConnectionError] = useState<Record<string, string | null>>({})
  const [activeConnections, setActiveConnections] = useState<ActiveConnection[]>([])

  const loadServersFromStorage = useCallback((): Record<string, MCPServer> => {
    if (typeof window === "undefined") return {}

    const servers: Record<string, MCPServer> = {}
    const storageKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))

    storageKeys
      .filter((key) => key?.startsWith("mcp_server_"))
      .forEach((key) => {
        const server = readStorage<MCPServer>(key!)
        if (server?.id) {
          servers[server.id] = server
        }
      })

    return servers
  }, [readStorage])

  const [localStorageServers, setLocalStorageServers] = useState(loadServersFromStorage)

  const injectEnvVariables = useCallback((server: MCPServer): MCPServer => {
    const requiredKeys = server.config?.requiresEnv || []
    if (requiredKeys.length === 0) return server

    const envMap = requiredKeys.reduce(
      (acc, keyName) => {
        const lookupKey = `NEXT_PUBLIC_${keyName}`
        const apiKey = env[lookupKey as keyof typeof env] as string | undefined

        if (apiKey?.trim()) {
          acc[keyName] = apiKey
        }
        return acc
      },
      {} as Record<string, string>,
    )

    return {
      ...server,
      config: server.config
        ? {
            ...server.config,
            env: Object.keys(envMap).length > 0 ? envMap : undefined,
          }
        : undefined,
    }
  }, [])

  const allAvailableServers = useMemo(() => {
    const processedMcpServers = Object.fromEntries(
      Object.entries(mcpServers).map(([id, server]) => [id, injectEnvVariables(server)]),
    )
    return {
      ...processedMcpServers,
      ...localStorageServers,
    }
  }, [mcpServers, localStorageServers, injectEnvVariables])

  function saveServerToAvailableServers(server: MCPServer) {
    writeStorage(`mcp_server_${server.id}`, server)
    setLocalStorageServers((prev) => ({ ...prev, [server.id]: server }))
  }

  function removeServerFromAvailableServers(serverId: string) {
    removeStorage(`mcp_server_${serverId}`)
    setLocalStorageServers((prev) => {
      const updated = { ...prev }
      delete updated[serverId]
      return updated
    })
  }

  const connectMutation = useMutation<RouterOutputs["connection"]["connect"], Error, { servers: MCPServer[] }>({
    mutationFn: async (mcpServers: { servers: MCPServer[] }) => {
      return client.connection.connect.mutate({ servers: mcpServers.servers })
    },
    onMutate: (mcpServers: { servers: MCPServer[] }) => {
      const { servers } = mcpServers
      servers.forEach((server) => {
        setConnectionStatus((prev) => ({ ...prev, [server.id]: "connecting" }))
        setConnectionError((prev) => ({ ...prev, [server.id]: null }))
      })
    },
    onSuccess: (data: RouterOutputs["connection"]["connect"], mcpServers: { servers: MCPServer[] }) => {
      mcpServers.servers.forEach((server) => {
        const result = data.results.find((r) => r.serverId === server.id)
        if (result?.success) {
          setConnectionStatus((prev) => ({ ...prev, [server.id]: "connected" }))
          setConnectionError((prev) => ({ ...prev, [server.id]: null }))
          const newConnection: ActiveConnection = {
            serverId: result.serverId,
            name: server.name,
            tools: result.tools || {},
          }
          setActiveConnections((prev) => {
            const exists = prev.some((conn) => conn.serverId === server.id)
            if (exists) return prev
            return [...prev, newConnection]
          })
          play("./sounds/connect.mp3", { volume: 0.5 })
        } else {
          const errorMsg =
            result && "error" in result && typeof result.error === "string" ? result.error : "Connection failed"
          setConnectionStatus((prev) => ({ ...prev, [server.id]: "error" }))
          setConnectionError((prev) => ({ ...prev, [server.id]: errorMsg }))
          play("./sounds/error.mp3", { volume: 0.5 })
          toast.error(errorMsg, {
            icon: null,
            id: `mcp-error-${server.id}`,
            duration: 5000,
            position: "bottom-center",
            style: errorToastStyle,
          })
        }
      })
    },
    onError: (error: Error, mcpServers: { servers: MCPServer[] }) => {
      mcpServers.servers.forEach((server) => {
        setConnectionStatus((prev) => ({ ...prev, [server.id]: "error" }))
        setConnectionError((prev) => ({
          ...prev,
          [server.id]: error.message || "An unexpected error occurred during connecting",
        }))
        play("./sounds/error.mp3", { volume: 0.5 })
        toast.error(error.message, {
          icon: null,
          id: `mcp-error-${server.id}`,
          duration: 5000,
          position: "bottom-center",
          style: errorToastStyle,
        })
      })
    },
  })

  const disconnectMutation = useMutation<{ message: string }, Error, { serverId: string }>({
    mutationFn: async (variables: { serverId: string }) => {
      return client.connection.disconnect.mutate(variables)
    },
    onMutate: (variables: { serverId: string }) => {
      const { serverId } = variables
      setConnectionStatus((prev) => ({ ...prev, [serverId]: "disconnected" }))
    },
    onSuccess: (_data: { message: string }, variables: { serverId: string }) => {
      const { serverId } = variables
      setConnectionError((prev) => ({ ...prev, [serverId]: null }))
      setActiveConnections((prev) => prev.filter((conn) => conn.serverId !== serverId))
    },
    onError: (error: Error, variables: { serverId: string }) => {
      const { serverId } = variables
      setConnectionStatus((prev) => ({ ...prev, [serverId]: "error" }))
      setConnectionError((prev) => ({ ...prev, [serverId]: error.message || "Disconnection failed" }))
    },
  })

  const connect = async (servers: MCPServer[]) => {
    // Prevent duplicate connections
    if (servers.some((server) => connectionStatus[server.id] === "connecting")) return
    if (!userId) {
      servers.forEach((server) => {
        setConnectionStatus((prev) => ({ ...prev, [server.id]: "error" }))
        setConnectionError((prev) => ({ ...prev, [server.id]: "User ID not available in context" }))
      })
      return
    }
    if (!isServerHealthy) {
      servers.forEach((server) => {
        play("./sounds/error.mp3", { volume: 0.5 })
        toast.error("Server is offline", {
          icon: null,
          id: `mcp-error-${server.id}`,
          duration: 5000,
          position: "bottom-center",
          style: errorToastStyle,
        })
      })
      return
    }
    try {
      await connectMutation.mutateAsync({ servers })
    } catch (err) {
      servers.forEach((server) => {
        if (connectionStatus[server.id] !== "error") {
          setConnectionStatus((prev) => ({ ...prev, [server.id]: "error" }))
          setConnectionError((prev) => ({
            ...prev,
            [server.id]: err instanceof Error ? err.message : "Connection failed",
          }))
        }
      })
    }
  }

  const disconnect = async (serverId: string) => {
    if (!userId) {
      setConnectionStatus((prev) => ({ ...prev, [serverId]: "disconnected" }))
      setConnectionError((prev) => ({ ...prev, [serverId]: null }))
      return
    }
    await disconnectMutation.mutateAsync({ serverId })
    play("./sounds/disconnect.mp3", { volume: 0.5 })
  }

  const disconnectAll = async () => {
    if (!userId || activeConnections.length === 0) return
    for (const conn of activeConnections) {
      await disconnect(conn.serverId)
    }
  }

  const getConnectionStatus = (serverId: string): ConnectionStatus => {
    return connectionStatus[serverId] || "disconnected"
  }

  const getConnectionError = (serverId: string): string | null => {
    return connectionError[serverId] || null
  }

  return {
    connectionStatus,
    connectionError,
    activeConnections,
    isServerHealthy,
    connect,
    disconnect,
    disconnectAll,
    getConnectionStatus,
    getConnectionError,
    hasActiveConnections: activeConnections.length > 0,
    mcpServers,
    allAvailableServers,
    saveServerToAvailableServers,
    removeServerFromAvailableServers,
  }
}

type MCPContextType = ReturnType<typeof useMCP>

const MCPContext = createContext<MCPContextType | undefined>(undefined)

export function MCPProvider({
  children,
  mcpServers,
  isServerHealthy,
}: {
  children: React.ReactNode
  mcpServers: Record<string, MCPServer>
  isServerHealthy: boolean
}) {
  const value = useMCP(mcpServers, isServerHealthy)
  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>
}

export function useMCPContext() {
  const ctx = useContext(MCPContext)
  if (!ctx) {
    throw new Error("useMCPContext must be used within a MCPProvider")
  }
  return ctx
}
