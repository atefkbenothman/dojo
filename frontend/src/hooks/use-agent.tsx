"use client"

import { createContext, useContext, useCallback, ReactNode, useState } from "react"
import { useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useConnectionContext } from "@/hooks/use-connection"
import { AgentConfig } from "@/lib/types"

const agentQueryClient = new QueryClient()

interface UseAgentLogicReturn {
  runAgent: (agentConfig: AgentConfig) => Promise<any>
  stopAgent: () => Promise<any>
  isLoading: boolean
  isAgentRunning: boolean
  isStopping: boolean
  errorMessage: string | null
}

const AgentContext = createContext<UseAgentLogicReturn | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const { getOrCreateSessionId } = useConnectionContext()

  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Run agent mutation
  const agentRunMutation = useMutation<any, Error, AgentConfig>({
    mutationFn: async (agentConfig: AgentConfig) => {
      const sessionId = getOrCreateSessionId()
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, config: agentConfig }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to run agent")
      }

      return data
    },
    onSuccess: () => {
      setIsAgentRunning(true)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
      setIsAgentRunning(false)
    },
    onMutate: () => {
      setIsAgentRunning(false)
    },
  })

  // Stop agent mutation
  const agentStopMutation = useMutation<any, Error, void>({
    mutationFn: async () => {
      const sessionId = getOrCreateSessionId()
      const response = await fetch("/api/agent/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to stop agent")
      }

      return data
    },
    onSuccess: () => {
      setErrorMessage(null)
      setIsAgentRunning(false)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
    onMutate: () => {
      setErrorMessage(null)
    },
  })

  const runAgent = useCallback(
    async (agentConfig: AgentConfig) => {
      return agentRunMutation.mutateAsync(agentConfig)
    },
    [agentRunMutation],
  )

  const stopAgent = useCallback(async () => {
    return agentStopMutation.mutateAsync()
  }, [agentStopMutation])

  const agentLogic: UseAgentLogicReturn = {
    runAgent,
    stopAgent,
    isLoading: agentRunMutation.isPending || agentStopMutation.isPending,
    isAgentRunning,
    isStopping: agentStopMutation.isPending,
    errorMessage,
  }

  return <AgentContext.Provider value={agentLogic}>{children}</AgentContext.Provider>
}

export function useAgentProvider() {
  const context = useContext(AgentContext)
  if (context === undefined) {
    throw new Error("useAgentProvider must be used within an AgentProvider")
  }
  return context
}

export function AgentProviderRoot({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={agentQueryClient}>
      <AgentProvider>{children}</AgentProvider>
    </QueryClientProvider>
  )
}
