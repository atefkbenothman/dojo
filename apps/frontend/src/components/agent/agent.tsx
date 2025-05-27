"use client"

import { AddAgentCard } from "@/components/agent/add-agent"
import { AgentList } from "@/components/agent/agent-list"
import { useAgentProvider } from "@/hooks/use-agent"
import type { AgentConfig } from "@dojo/config"
import { useState, useEffect } from "react"

export function Agent() {
  const { agents } = useAgentProvider()

  const [customAgents, setCustomAgents] = useState<Record<string, AgentConfig>>({})
  const [allAgents, setAllAgents] = useState<Record<string, AgentConfig>>(() => ({
    ...agents,
    ...customAgents,
  }))

  useEffect(() => {
    setAllAgents({ ...agents, ...customAgents })
  }, [agents, customAgents])

  const handleAddAgent = (newAgent: AgentConfig) => {
    setCustomAgents((prev: Record<string, AgentConfig>) => ({
      ...prev,
      [newAgent.id]: newAgent,
    }))
  }

  const handleDeleteAgent = (agentId: string) => {
    setCustomAgents((prev: Record<string, AgentConfig>) => {
      const newAgents = { ...prev }
      delete newAgents[agentId]
      return newAgents
    })
  }

  const handleEditAgent = (agent: AgentConfig) => {
    console.log("Editing agent (from agent.tsx):", agent)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row flex-wrap gap-4">
        <AddAgentCard onAddAgent={handleAddAgent} />
        <AgentList
          agents={allAgents}
          onEditAgent={handleEditAgent}
          onDeleteAgent={handleDeleteAgent}
          customAgentIds={Object.keys(customAgents)}
        />
      </div>
    </div>
  )
}
