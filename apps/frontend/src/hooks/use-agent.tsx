"use client"

import { useSoundEffectContext } from "./use-sound-effect"
import { useChatProvider } from "@/hooks/use-chat"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useMCPContext } from "@/hooks/use-mcp"
import { useModelContext } from "@/hooks/use-model"
import { getApiKeyForModel } from "@/lib/utils"
import { AI_MODELS, type AgentConfig, type AgentInteraction } from "@dojo/config"
import { Message } from "ai"
import { nanoid } from "nanoid"
import { createContext, useContext, useCallback, ReactNode, useState, useMemo } from "react"

function useAgentContext(agents: Record<string, AgentConfig>) {
  const { readStorage, writeStorage, removeStorage } = useLocalStorage()
  const { connect } = useMCPContext()
  const { play } = useSoundEffectContext()
  const { append, setMessages } = useChatProvider()
  const { selectedModel, setSelectedModelId } = useModelContext()

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
    return {
      ...agents,
      ...localStorageAgents,
    }
  }, [agents, localStorageAgents])

  const runAgent = useCallback(
    async (agentId: string) => {
      const agent = allAvailableAgents[agentId]
      if (!agent) {
        throw new Error(`Agent with id ${agentId} not found`)
      }
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: `Starting agent ${agent.name}`,
        },
      ])
      if (agent.output.type === "text") {
        if (agent.output.mcpServers) {
          setMessages((prev) => [
            ...prev,
            {
              id: nanoid(),
              role: "assistant",
              content: "Connecting to MCP servers",
            },
          ])
          await connect(agent.output.mcpServers)
        }
      }
      const apiKey = getApiKeyForModel(selectedModel)
      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: agent.systemPrompt,
      }
      const agentBody: AgentInteraction & { schemaJson?: string } = {
        modelId: selectedModel.id,
        agentConfig: agent,
      }
      if (agent.output.type === "object") {
        agentBody.schemaJson = JSON.stringify(agent.output.objectJsonSchema)
      }
      append(userMessage, {
        body: {
          interactionType: "agent",
          apiKey,
          agent: agentBody,
        },
      })
      play("./sounds/chat.mp3", { volume: 0.5 })
    },
    [allAvailableAgents, connect, append],
  )

  return {
    allAvailableAgents,
    runAgent,
    saveAgentToAvailableAgents,
    removeAgentFromAvailableAgents,
  }
}

type AgentContextType = ReturnType<typeof useAgentContext>

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function useAgentProvider() {
  const ctx = useContext(AgentContext)
  if (!ctx) {
    throw new Error("useAgentProvider must be used within an AgentProvider")
  }
  return ctx
}

export function AgentProvider({ children, agents }: { children: ReactNode; agents: Record<string, AgentConfig> }) {
  const value = useAgentContext(agents)
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}
