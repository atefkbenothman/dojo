"use client"

import { useState, createContext, useContext } from "react"
import { useMutation, QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import type { MCPServerConfig } from "@/lib/types"

const queryClient = new QueryClient()

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export interface ActiveConnection {
  serverId: string
  name: string
  toolCount: number
}

export function useConnection() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({})
  const [connectionError, setConnectionError] = useState<Record<string, string | null>>({})
  const [activeConnections, setActiveConnections] = useState<ActiveConnection[]>([])

  const { data: serverHealth } = useQuery({
    queryKey: ["server-health"],
    queryFn: async () => {
      const response = await fetch("/api/mcp/health", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Server health check failed")
      return response.json()
    },
    retry: false,
  })

  const isServerHealthy = serverHealth?.success || false

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (config: MCPServerConfig) => {
      const serializableConfig = {
        id: config.id,
        name: config.name,
        command: config.command,
        args: config.args,
        env: config.env,
      }
      const response = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSessionId: sessionId,
          config: serializableConfig,
        }),
        cache: "no-store",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Connection failed")
      }

      return data
    },
    onMutate: (config) => {
      setConnectionStatus((prev) => ({
        ...prev,
        [config.id]: "connecting",
      }))
      setConnectionError((prev) => ({
        ...prev,
        [config.id]: null,
      }))
    },
    onSuccess: (data, config) => {
      setSessionId(data.sessionId)
      setConnectionStatus((prev) => ({
        ...prev,
        [config.id]: "connected",
      }))
      setConnectionError((prev) => ({
        ...prev,
        [config.id]: null,
      }))

      // Add the new connection to activeConnections
      const newConnection: ActiveConnection = {
        serverId: config.id,
        name: config.name,
        toolCount: 0,
      }

      setActiveConnections((prev) => {
        const exists = prev.some((conn) => conn.serverId === config.id)
        if (exists) return prev
        return [...prev, newConnection]
      })
    },
    onError: (error, config) => {
      setConnectionStatus((prev) => ({
        ...prev,
        [config.id]: "error",
      }))
      setConnectionError((prev) => ({
        ...prev,
        [config.id]: error.message || "An unexpected error occurred during connecting",
      }))
    },
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (serverId: string) => {
      if (!sessionId) throw new Error("No sessionId to disconnect")

      const response = await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, serverId }),
        cache: "no-store",
      })

      if (!response.ok) throw new Error("Disconnection failed")
      return response.json()
    },
    onMutate: (serverId) => {
      setConnectionStatus((prev) => ({
        ...prev,
        [serverId]: "disconnected",
      }))
    },
    onSuccess: (data, serverId) => {
      setConnectionError((prev) => ({
        ...prev,
        [serverId]: null,
      }))

      // Remove from active connections
      setActiveConnections((prev) => prev.filter((conn) => conn.serverId !== serverId))
    },
    onError: (error, serverId) => {
      setConnectionStatus((prev) => ({
        ...prev,
        [serverId]: "error",
      }))
      setConnectionError((prev) => ({
        ...prev,
        [serverId]: error.message || "Disconnection failed",
      }))
    },
  })

  const connect = async (config: MCPServerConfig) => {
    if (connectionStatus[config.id] === "connecting") return
    await connectMutation.mutateAsync(config)
  }

  const disconnect = async (serverId: string) => {
    if (!sessionId) {
      setConnectionStatus((prev) => ({
        ...prev,
        [serverId]: "disconnected",
      }))
      setConnectionError((prev) => ({
        ...prev,
        [serverId]: null,
      }))
      return
    }

    await disconnectMutation.mutateAsync(serverId)
  }

  const disconnectAll = async () => {
    if (!sessionId || activeConnections.length === 0) return
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

  const isConnected = (serverId: string): boolean => {
    return connectionStatus[serverId] === "connected"
  }

  return {
    sessionId,
    connectionStatus,
    connectionError,
    activeConnections,
    isServerHealthy,
    connect,
    disconnect,
    disconnectAll,
    getConnectionStatus,
    getConnectionError,
    isConnected,
    hasActiveConnections: activeConnections.length > 0,
  }
}

type ConnectionContextType = ReturnType<typeof useConnection>

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined)

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const value = useConnection()
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>
}

export function ConnectionProviderRoot({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider>{children}</ConnectionProvider>
    </QueryClientProvider>
  )
}

export function useConnectionContext() {
  const ctx = useContext(ConnectionContext)
  if (!ctx) {
    throw new Error("useConnectionContext must be used within a ConnectionProvider")
  }
  return ctx
}
