"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"
import type { AgentConfig } from "@dojo/config"
import { createContext, useContext, useCallback, ReactNode, useState, useMemo } from "react"

function useAgentContext(agents: Record<string, AgentConfig>) {
  const { readStorage, writeStorage, removeStorage } = useLocalStorage()

  const loadAgentsFromStorage = useCallback((): Record<string, AgentConfig> => {
    if (typeof window === "undefined") return {}
    const agents: Record<string, AgentConfig> = {}
    const storageKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    storageKeys
      .filter((key) => key?.startsWith("agent_"))
      .forEach((key) => {
        const agent = readStorage<AgentConfig>(key!)
        if (agent?.id) {
          agents[agent.id] = agent
        }
      })
    return agents
  }, [readStorage])

  const [localStorageAgents, setLocalStorageAgents] = useState(loadAgentsFromStorage)

  function saveAgentToAvailableAgents(agent: AgentConfig) {
    writeStorage(`agent_${agent.id}`, agent)
    setLocalStorageAgents((prev) => ({ ...prev, [agent.id]: agent }))
  }

  function removeAgentFromAvailableAgents(agentId: string) {
    removeStorage(`agent_${agentId}`)
    setLocalStorageAgents((prev) => {
      const updated = { ...prev }
      delete updated[agentId]
      return updated
    })
  }

  const allAvailableAgents = useMemo(() => {
    // console.log("agents", agents)
    // console.log("localStorageAgents", localStorageAgents)
    const mergedAgents = {
      ...agents,
      ...localStorageAgents,
    }
    console.log("mergedAgents", mergedAgents)
    return mergedAgents
  }, [agents, localStorageAgents])

  return {
    localStorageAgents,
    saveAgentToAvailableAgents,
    removeAgentFromAvailableAgents,
    allAvailableAgents,
  }
}

type AgentContextType = ReturnType<typeof useAgentContext>

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children, agents }: { children: ReactNode; agents: Record<string, AgentConfig> }) {
  const value = useAgentContext(agents)
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgentProvider() {
  const ctx = useContext(AgentContext)
  if (!ctx) {
    throw new Error("useAgentProvider must be used within an AgentProvider")
  }
  return ctx
}

// const userId = useUserContext()

// const { unifiedAppend, stop, status, currentInteractionType } = useChatProvider()

// const [errorMessage, setErrorMessage] = useState<string | null>(null)
// const isAgentStreaming = status === "streaming" && currentInteractionType === "agent"
// const isAgentRunning = isAgentStreaming || status === "submitted"

// useEffect(() => {
//   if (isAgentRunning) {
//     setErrorMessage(null)
//   }
// }, [isAgentRunning])

// const agentStopMutation = useMutation<AgentStopResponse, Error, void>({
//   mutationFn: async () => {
//     if (!userId) {
//       throw new Error("Failed to get UserID for stopping agent.")
//     }

//     console.log(`[Agent Hook] Stopping backend connections for session: ${userId}...`)
//     const response = await fetch("/api/agent/stop", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ userId }),
//     })
//     const data = await response.json()
//     if (!response.ok) throw new Error(data.message || "Failed to stop agent backend")
//     return data
//   },
//   onSuccess: () => {},
//   onError: (error: Error) => setErrorMessage(error.message),
//   onMutate: () => setErrorMessage(null),
// })

// const runAgent = useCallback(
//   async (agentConfig: AgentConfig) => {
//     if (!userId) {
//       setErrorMessage("Failed to get UserID. Cannot run agent")
//       return
//     }

//     setErrorMessage(null)

//     try {
//       await unifiedAppend({ id: nanoid(), role: "user", content: agentConfig.systemPrompt } as Message, {
//         body: {
//           modelId: agentConfig.modelId,
//           config: agentConfig,
//           interactionType: "agent",
//         },
//         interactionType: "agent",
//         initialDisplayMessage: {
//           role: "assistant",
//           id: "agent-start",
//           content: `Agent ${agentConfig.name} is starting...`,
//         },
//       })
//     } catch (err) {
//       console.error("[Agent Hook] Error calling unifiedAppend for agent run:", err)
//       setErrorMessage(`Failed to initiate agent run via unifiedAppend: ${err}`)
//     }
//   },
//   [unifiedAppend, userId],
// )

// const stopAgent = useCallback(async () => {
//   try {
//     await agentStopMutation.mutateAsync()
//     if (isAgentStreaming) {
//       stop()
//     }
//   } catch (error) {
//     console.error("[Agent Hook] Error during agentStopMutation or stopping SDK stream:", error)
//   }
// }, [agentStopMutation, stop, isAgentStreaming])
