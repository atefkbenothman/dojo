"use client"

import { useChatProvider } from "@/hooks/use-chat"
import { useUserContext } from "@/hooks/use-user-id"
import type { AgentConfig } from "@dojo/config"
import { useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createContext, useContext, useCallback, ReactNode, useState, useEffect } from "react"

interface AgentStopResponse {
  success: boolean
  message: string
}

const agentQueryClient = new QueryClient()

function useAgentLogic(agents: Record<string, AgentConfig>) {
  const userId = useUserContext()

  const { unifiedAppend, stop, status, currentInteractionType } = useChatProvider()

  const [isAgentRunAttempted, setIsAgentRunAttempted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isAgentStreaming = status === "streaming" && currentInteractionType === "agent"

  useEffect(() => {
    if (isAgentRunAttempted || isAgentStreaming) {
      setErrorMessage(null)
    }
  }, [isAgentRunAttempted, isAgentStreaming])

  useEffect(() => {
    if (!isAgentStreaming && status !== "streaming" && currentInteractionType !== "agent" && isAgentRunAttempted) {
      setIsAgentRunAttempted(false)
    }
  }, [status, currentInteractionType, isAgentRunAttempted, isAgentStreaming])

  const agentStopMutation = useMutation<AgentStopResponse, Error, void>({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("Failed to get UserID for stopping agent.")
      }

      console.log(`[Agent Hook] Stopping backend connections for session: ${userId}...`)
      const response = await fetch("/api/agent/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Failed to stop agent backend")
      return data
    },
    onSuccess: () => {
      setIsAgentRunAttempted(false)
    },
    onError: (error: Error) => setErrorMessage(error.message),
    onMutate: () => setErrorMessage(null),
  })

  const runAgent = useCallback(
    async (agentConfig: AgentConfig) => {
      if (!userId) {
        setErrorMessage("Failed to get UserID. Cannot run agent")
        return
      }

      setErrorMessage(null)
      setIsAgentRunAttempted(true)

      try {
        await unifiedAppend(
          { role: "user", content: agentConfig.systemPrompt },
          {
            body: {
              userId: userId,
              modelId: agentConfig.modelId,
              config: agentConfig,
              interactionType: "agent",
            },
            interactionType: "agent",
            initialDisplayMessage: {
              role: "assistant",
              id: "agent-start",
              content: `Agent ${agentConfig.name} is starting...`,
            },
          },
        )
      } catch (err) {
        console.error("[Agent Hook] Error calling unifiedAppend for agent run:", err)
        setErrorMessage(`Failed to initiate agent run via unifiedAppend: ${err}`)
        setIsAgentRunAttempted(false)
      }
    },
    [unifiedAppend, userId],
  )

  const stopAgent = useCallback(async () => {
    try {
      await agentStopMutation.mutateAsync()
      if (isAgentStreaming) {
        stop()
      }
    } catch (error) {
      console.error("[Agent Hook] Error during agentStopMutation or stopping SDK stream:", error)
    } finally {
      setIsAgentRunAttempted(false)
    }
  }, [agentStopMutation, stop, isAgentStreaming])

  return {
    runAgent,
    stopAgent,
    isAgentRunning: isAgentStreaming || isAgentRunAttempted,
    isAgentStreaming,
    isStopping: agentStopMutation.isPending,
    errorMessage,
    agents,
  }
}

type AgentContextType = ReturnType<typeof useAgentLogic>

const AgentContext = createContext<AgentContextType | undefined>(undefined)

interface AgentProviderProps {
  children: ReactNode
  agents: Record<string, AgentConfig>
}

export function AgentProvider({ children, agents }: AgentProviderProps) {
  const agentLogicAndData = useAgentLogic(agents)
  return <AgentContext.Provider value={agentLogicAndData}>{children}</AgentContext.Provider>
}

export function useAgentProvider() {
  const context = useContext(AgentContext)
  if (context === undefined) {
    throw new Error("useAgentProvider must be used within an AgentProvider")
  }
  return context
}

export function AgentProviderRoot({ children, agents }: { children: ReactNode; agents: Record<string, AgentConfig> }) {
  return (
    <QueryClientProvider client={agentQueryClient}>
      <AgentProvider agents={agents}>{children}</AgentProvider>
    </QueryClientProvider>
  )
}
