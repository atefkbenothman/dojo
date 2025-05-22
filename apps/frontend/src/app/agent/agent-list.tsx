"use client"

import { AgentCard } from "@/app/agent/agent-card"
import type { AgentConfig } from "@dojo/config"

interface AgentListProps {
  agents: Record<string, AgentConfig>
  onEditAgent: (agent: AgentConfig) => void
  onDeleteAgent: (agentId: string) => void
  customAgentIds: string[]
}

export function AgentList({ agents, onEditAgent, onDeleteAgent, customAgentIds }: AgentListProps) {
  return (
    <>
      {Object.entries(agents).map(([key, agent]) => (
        <AgentCard
          key={key}
          agent={agent}
          onEdit={() => onEditAgent(agent)}
          onDelete={customAgentIds.includes(agent.id) ? () => onDeleteAgent(agent.id) : undefined}
        />
      ))}
    </>
  )
}
