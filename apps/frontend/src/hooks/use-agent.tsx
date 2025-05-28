"use client"

import { useChatProvider } from "@/hooks/use-chat"
import { useUserContext } from "@/hooks/use-user-id"
import type { AgentConfig } from "@dojo/config"
import { useMutation } from "@tanstack/react-query"
import { Message } from "ai"
import { nanoid } from "nanoid"
import { createContext, useContext, useCallback, ReactNode, useState, useEffect } from "react"

interface AgentStopResponse {
  success: boolean
  message: string
}

function useAgentLogic(agents: Record<string, AgentConfig>) {
  const userId = useUserContext()

  const { unifiedAppend, stop, status, currentInteractionType } = useChatProvider()

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isAgentStreaming = status === "streaming" && currentInteractionType === "agent"
  const isAgentRunning = isAgentStreaming || status === "submitted"

  useEffect(() => {
    if (isAgentRunning) {
      setErrorMessage(null)
    }
  }, [isAgentRunning])

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
    onSuccess: () => {},
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

      try {
        await unifiedAppend({ id: nanoid(), role: "user", content: agentConfig.systemPrompt } as Message, {
          body: {
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
        })
      } catch (err) {
        console.error("[Agent Hook] Error calling unifiedAppend for agent run:", err)
        setErrorMessage(`Failed to initiate agent run via unifiedAppend: ${err}`)
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
    }
  }, [agentStopMutation, stop, isAgentStreaming])

  return {
    runAgent,
    stopAgent,
    isAgentRunning,
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
  return <AgentProvider agents={agents}>{children}</AgentProvider>
}
