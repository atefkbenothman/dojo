"use client"

import { useAgentProvider } from "./use-agent"
import { useSoundEffectContext } from "./use-sound-effect"
import { useChatProvider } from "@/hooks/use-chat"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useMCPContext } from "@/hooks/use-mcp"
import { useModelContext } from "@/hooks/use-model"
import { getApiKeyForModel } from "@/lib/utils"
import { AgentWorkflow, AI_MODELS, type AgentConfig, type AgentInteraction } from "@dojo/config"
import { Message } from "ai"
import { nanoid } from "nanoid"
import { createContext, useContext, useCallback, ReactNode, useState, useMemo } from "react"

function useWorkflowContext(workflows: Record<string, AgentWorkflow>) {
  const { readStorage, writeStorage, removeStorage } = useLocalStorage()
  const { connect } = useMCPContext()
  const { play } = useSoundEffectContext()
  const { append, setMessages } = useChatProvider()
  const { setSelectedModelId } = useModelContext()
  const { allAvailableAgents } = useAgentProvider()

  // const loadAgentsFromStorage = useCallback((): Record<string, AgentConfig> => {
  //   if (typeof window === "undefined") return {}
  //   const agents: Record<string, AgentConfig> = {}
  //   const storageKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
  //   storageKeys
  //     .filter((key) => key?.startsWith("agent_"))
  //     .forEach((key) => {
  //       const agent = readStorage<AgentConfig>(key!)
  //       if (agent?.id) {
  //         agents[agent.id] = agent
  //       }
  //     })
  //   return agents
  // }, [readStorage])

  const [localStorageWorkflows, setLocalStorageWorkflows] = useState(workflows)

  // function saveAgentToAvailableAgents(agent: AgentConfig) {
  //   writeStorage(`agent_${agent.id}`, agent)
  //   setLocalStorageAgents((prev) => ({ ...prev, [agent.id]: agent }))
  // }

  // function removeAgentFromAvailableAgents(agentId: string) {
  //   removeStorage(`agent_${agentId}`)
  //   setLocalStorageAgents((prev) => {
  //     const updated = { ...prev }
  //     delete updated[agentId]
  //     return updated
  //   })
  // }

  const allAvailableWorkflows = useMemo(() => {
    return {
      ...workflows,
      ...localStorageWorkflows,
    }
  }, [workflows, localStorageWorkflows])

  const runWorkflow = useCallback(
    async (workflowId: string) => {
      const workflow = allAvailableWorkflows[workflowId]
      if (!workflow) {
        throw new Error(`Workflow with id ${workflowId} not found`)
      }
      setSelectedModelId(workflow.aiModelId)
      setMessages([
        {
          id: nanoid(),
          role: "system",
          content: workflow.prompt,
        },
        {
          id: nanoid(),
          role: "assistant",
          content: `Starting workflow ${workflow.name}`,
        },
      ])
      const model = AI_MODELS[workflow.aiModelId]
      if (!model) {
        throw new Error(`Model with id ${workflow.aiModelId} not found`)
      }
      for (const step of workflow.steps) {
        const agentConfig = allAvailableAgents[step.agentConfigId]
        if (agentConfig?.output.type === "text" && agentConfig.output.mcpServers) {
          await connect(agentConfig.output.mcpServers)
        }
      }
      const apiKey = getApiKeyForModel(model)
      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: workflow.prompt,
      }
      append(userMessage, {
        body: {
          interactionType: "workflow",
          apiKey,
          workflow,
        },
      })
      play("./sounds/chat.mp3", { volume: 0.5 })
    },
    [allAvailableWorkflows, connect, append, allAvailableAgents],
  )

  return {
    allAvailableWorkflows,
    runWorkflow,
    // saveAgentToAvailableAgents,
    // removeAgentFromAvailableAgents,
  }
}

type WorkflowContextType = ReturnType<typeof useWorkflowContext>

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined)

export function useWorkflowProvider() {
  const ctx = useContext(WorkflowContext)
  if (!ctx) {
    throw new Error("useWorkflowProvider must be used within an WorkflowProvider")
  }
  return ctx
}

export function WorkflowProvider({
  children,
  workflows,
}: {
  children: ReactNode
  workflows: Record<string, AgentWorkflow>
}) {
  const value = useWorkflowContext(workflows)
  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
}
