"use client"

import { useState, createContext, useContext } from "react"
import { useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { MCPServerConfig } from "@/lib/types"

const queryClient = new QueryClient()

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export function useConnection() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectedServerId, setConnectedServerId] = useState<string | null>(null)

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
      if (!response.ok) throw new Error("Connection failed")
      return response.json()
    },
    onMutate: () => {
      setConnectionStatus("connecting")
      setConnectionError(null)
      setConnectedServerId(null)
    },
    onSuccess: (data, variables) => {
      setSessionId(data.sessionId)
      setConnectionStatus("connected")
      setConnectionError(null)
      setConnectedServerId(variables.id)
    },
    onError: (error) => {
      setConnectionStatus("error")
      setConnectionError("An unexpected error occurred during connecting")
      setSessionId(null)
      setConnectedServerId(null)
    },
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("No sessionId to disconnect")
      const response = await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Disconnection failed")
      return response.json()
    },
    onMutate: () => {
      setConnectedServerId(null)
    },
    onSuccess: () => {
      setConnectionStatus("disconnected")
      setConnectionError(null)
      setSessionId(null)
    },
    onError: (err) => {
      setConnectionStatus("error")
      setConnectionError(`Disconnection error: ${err}`)
      setSessionId(null)
      setConnectedServerId(null)
    },
  })

  const connect = async (config: MCPServerConfig) => {
    if (connectionStatus === "connecting" || connectionStatus === "connected") return
    await connectMutation.mutateAsync(config)
  }

  const disconnect = async () => {
    if (connectionStatus !== "connected" || !sessionId) {
      setConnectionStatus("disconnected")
      setSessionId(null)
      setConnectionError(null)
      return
    }
    await disconnectMutation.mutateAsync()
  }

  return {
    sessionId,
    connectionStatus,
    connectionError,
    connectedServerId,
    connect,
    disconnect,
    isConnecting: connectionStatus === "connecting",
    isConnected: connectionStatus === "connected",
    isDisconnected: connectionStatus === "disconnected",
    isError: connectionStatus === "error",
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
