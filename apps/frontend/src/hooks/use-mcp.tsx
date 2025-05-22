"use client"

import { useSoundEffectContext } from "./use-sound-effect"
import { useUserContext } from "@/hooks/use-user-id"
import type { MCPServer } from "@dojo/config"
import { useMutation, QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import type { Tool } from "ai"
import { useState, createContext, useContext, useEffect } from "react"
import { toast } from "sonner"
import type { ZodTypeAny } from "zod"

const queryClient = new QueryClient()

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export interface ActiveConnection {
  serverId: string
  name: string
  tools: Record<string, Tool<ZodTypeAny, unknown>>
}

function useMCP(mcpServers: Record<string, MCPServer>) {
  const userId = useUserContext()
  const { play } = useSoundEffectContext()

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
    mutationFn: async ({ server }: { server: MCPServer }) => {
      if (!userId || typeof userId !== "string" || userId.trim() === "") throw new Error("User ID is not available")
      if (!server || typeof server.id !== "string" || !server.config)
        throw new Error("Invalid server object: missing id or config")

      const response = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, server }),
        cache: "no-store",
      })

      if (!response.ok) {
        let errorMessage = `Connection failed: ${response.statusText || "Unknown error"}`
        const errorData = await response.json()
        if (errorData && typeof errorData.error === "string" && errorData.error.trim() !== "") {
          errorMessage = errorData.error
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return { ...data, server }
    },
    onMutate: ({ server }: { server: MCPServer }) => {
      setConnectionStatus((prev) => ({
        ...prev,
        [server.id]: "connecting",
      }))
      setConnectionError((prev) => ({
        ...prev,
        [server.id]: null,
      }))
    },
    onSuccess: (data, { server }: { server: MCPServer }) => {
      setConnectionStatus((prev) => ({
        ...prev,
        [server.id]: "connected",
      }))
      setConnectionError((prev) => ({
        ...prev,
        [server.id]: null,
      }))
      const newConnection: ActiveConnection = {
        serverId: server.id,
        name: server.name,
        tools: data.tools || {},
      }
      setActiveConnections((prev) => {
        const exists = prev.some((conn) => conn.serverId === server.id)
        if (exists) return prev
        return [...prev, newConnection]
      })
      play("./connect.mp3", { volume: 0.5 })
    },
    onError: (error, { server }: { server: MCPServer }) => {
      setConnectionStatus((prev) => ({
        ...prev,
        [server.id]: "error",
      }))
      setConnectionError((prev) => ({
        ...prev,
        [server.id]: error.message || "An unexpected error occurred during connecting",
      }))
      play("./error.mp3", { volume: 0.5 })
      toast.error(error.message, {
        icon: null,
        id: `mcp-error-${server.id}`,
        duration: 5000,
        position: "bottom-center",
        style: {
          backgroundColor: "#9f0712",
          border: "1px solid #fb2c36",
          color: "#fff",
          height: "1.5rem",
          fontWeight: 800,
        },
      })
    },
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (serverId: string) => {
      if (!userId || typeof userId !== "string" || userId.trim() === "") throw new Error("No userId to disconnect")
      if (!serverId || typeof serverId !== "string" || serverId.trim() === "")
        throw new Error("No serverId to disconnect")
      const response = await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, serverId }),
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

  const connect = async ({ server }: { server: MCPServer }) => {
    if (connectionStatus[server.id] === "connecting") return
    if (!userId) {
      console.error("Cannot connect without a userId")
      setConnectionStatus((prev) => ({ ...prev, [server.id]: "error" }))
      setConnectionError((prev) => ({ ...prev, [server.id]: "User ID not available" }))
      return
    }
    if (!isServerHealthy) {
      play("./error.mp3", { volume: 0.5 })
      toast.error("Server is offline", {
        icon: null,
        id: `mcp-error-${server.id}`,
        duration: 5000,
        position: "bottom-center",
        style: {
          backgroundColor: "#9f0712",
          border: "1px solid #fb2c36",
          color: "#fff",
          height: "1.5rem",
          fontWeight: 800,
        },
      })
      return
    }
    try {
      await connectMutation.mutateAsync({ server })
    } catch {
      setConnectionStatus((prev) => ({ ...prev, [server.id]: "error" }))
      setConnectionError((prev) => ({ ...prev, [server.id]: "Connection failed" }))
    }
  }

  const disconnect = async (serverId: string) => {
    if (!userId) {
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
    play("./disconnect.mp3", { volume: 0.5 })
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
  }
}

type MCPContextType = ReturnType<typeof useMCP>

const MCPContext = createContext<MCPContextType | undefined>(undefined)

export function MCPProvider({
  children,
  mcpServers,
}: {
  children: React.ReactNode
  mcpServers: Record<string, MCPServer>
}) {
  const value = useMCP(mcpServers)
  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>
}

export function MCPProviderRoot({
  children,
  mcpServers,
}: {
  children: React.ReactNode
  mcpServers: Record<string, MCPServer>
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <MCPProvider mcpServers={mcpServers}>{children}</MCPProvider>
    </QueryClientProvider>
  )
}

export function useMCPContext() {
  const ctx = useContext(MCPContext)
  if (!ctx) {
    throw new Error("useMCPContext must be used within a MCPProvider")
  }
  return ctx
}
