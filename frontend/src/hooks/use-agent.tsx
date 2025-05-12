"use client"

import { createContext, useContext, useCallback, ReactNode } from "react"
import { useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useConnectionContext } from "@/hooks/use-connection"
import { AgentConfig } from "@/lib/types"

const agentQueryClient = new QueryClient()

interface UseAgentLogicReturn {
  runAgent: (agentConfig: AgentConfig) => Promise<any>
  isRunning: boolean
  errorMessage: string | null
  isSuccess: boolean
  resetAgentState: () => void
}

const AgentContext = createContext<UseAgentLogicReturn | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const { sessionId: currentSessionIdFromContext } = useConnectionContext()

  const agentRunMutation = useMutation<any, Error, AgentConfig>({
    mutationFn: async (agentConfig: AgentConfig) => {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentSessionIdFromContext, config: agentConfig }),
      })

      if (!response.ok) {
        let errorMessageText = "Failed to run agent"
        try {
          const errorData = await response.json()
          errorMessageText = errorData.message || errorMessageText
        } catch (e) {
          console.error("Error parsing error response:", e)
        }
        throw new Error(errorMessageText)
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        try {
          return await response.json()
        } catch (e) {
          console.error("Error parsing success JSON response:", e)
          throw new Error("Failed to parse successful agent run response.")
        }
      }
      return null
    },
  })

  const runAgent = useCallback(
    async (agentConfig: AgentConfig) => {
      return agentRunMutation.mutateAsync(agentConfig)
    },
    [agentRunMutation],
  )

  const agentLogic: UseAgentLogicReturn = {
    runAgent,
    isRunning: agentRunMutation.isPending,
    errorMessage: agentRunMutation.error?.message || null,
    isSuccess: agentRunMutation.isSuccess,
    resetAgentState: agentRunMutation.reset,
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
