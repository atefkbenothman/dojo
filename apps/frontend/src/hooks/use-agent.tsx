"use client"

import { createContext, useContext, useCallback, ReactNode, useState, useEffect } from "react"
import { useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useConnectionContext } from "@/hooks/use-connection"
import { useChatProvider } from "@/hooks/use-chat"
import { AgentConfig } from "@/lib/types"

interface AgentStopResponse {
  success: boolean
  message: string
}

const agentQueryClient = new QueryClient()

function useAgentLogic() {
  const { getOrCreateSessionId } = useConnectionContext()
  const { unifiedAppend, stop: stopSdkStream, status: globalStatus, currentInteractionType } = useChatProvider()

  const [isAgentRunAttempted, setIsAgentRunAttempted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isAgentStreaming = globalStatus === "streaming" && currentInteractionType === "agent"

  useEffect(() => {
    if (isAgentRunAttempted || isAgentStreaming) {
      setErrorMessage(null)
    }
  }, [isAgentRunAttempted, isAgentStreaming])

  useEffect(() => {
    if (
      !isAgentStreaming &&
      globalStatus !== "streaming" &&
      currentInteractionType !== "agent" &&
      isAgentRunAttempted
    ) {
      setIsAgentRunAttempted(false)
    }
  }, [globalStatus, currentInteractionType, isAgentRunAttempted, isAgentStreaming])

  const agentStopMutation = useMutation<AgentStopResponse, Error, void>({
    mutationFn: async () => {
      const currentSessionId = getOrCreateSessionId()
      if (!currentSessionId) {
        throw new Error("Failed to get SessionID for stopping agent.")
      }

      console.log(`[Agent Hook] Stopping backend connections for session: ${currentSessionId}...`)
      const response = await fetch("/api/agent/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentSessionId }),
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
      const currentSessionId = getOrCreateSessionId()

      if (!currentSessionId) {
        setErrorMessage("Failed to get SessionID. Cannot run agent")
        return
      }

      setErrorMessage(null)
      setIsAgentRunAttempted(true)

      try {
        await unifiedAppend(
          { role: "user", content: agentConfig.systemPrompt },
          {
            body: {
              sessionId: currentSessionId,
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
    [unifiedAppend, getOrCreateSessionId],
  )

  const stopAgent = useCallback(async () => {
    try {
      await agentStopMutation.mutateAsync()
      if (isAgentStreaming) {
        stopSdkStream()
      }
    } catch (error) {
      console.error("[Agent Hook] Error during agentStopMutation or stopping SDK stream:", error)
    } finally {
      setIsAgentRunAttempted(false)
    }
  }, [agentStopMutation, stopSdkStream, isAgentStreaming])

  return {
    runAgent,
    stopAgent,
    isAgentRunning: isAgentStreaming || isAgentRunAttempted,
    isAgentStreaming,
    isStopping: agentStopMutation.isPending,
    errorMessage,
  }
}

type AgentContextType = ReturnType<typeof useAgentLogic>

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const agentLogic = useAgentLogic()
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
