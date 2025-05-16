"use client"

import { AgentBuilder } from "@/app/agent/agent-builder"
import { AgentCard } from "@/app/agent/agent-card"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { AgentConfig, AgentConfigs } from "@/lib/types"
import { PlusIcon } from "lucide-react"
import { useState } from "react"

interface AgentListProps {
  agents: AgentConfigs
}

export function AgentList({ agents }: AgentListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [customAgents, setCustomAgents] = useState<AgentConfigs>({})
  const allAgents = { ...agents, ...customAgents }

  const handleAddAgent = (newAgent: AgentConfig) => {
    setCustomAgents((prev) => ({
      ...prev,
      [newAgent.id]: newAgent,
    }))
  }

  function AddAgentCard() {
    return (
      <Card
        className="hover:border-primary/80 hover:bg-muted/50 relative h-[10rem] max-h-[10rem] w-full max-w-xs cursor-pointer border transition-colors"
        onClick={() => setIsAddDialogOpen(true)}
      >
        <CardHeader className="flex h-full items-center justify-center">
          <CardTitle className="text-primary/90 flex items-center font-medium">
            <PlusIcon className="mr-2 h-5 w-5" />
            Add New Agent
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const handleEditAgent = (agent: AgentConfig) => {
    console.log("Editing agent:", agent)
  }

  const handleDeleteAgent = (agentId: string) => {
    setCustomAgents((prev) => {
      const newAgents = { ...prev }
      delete newAgents[agentId]
      return newAgents
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row flex-wrap gap-4">
        <AddAgentCard />
        {Object.entries(allAgents).map(([key, agent]) => (
          <AgentCard
            key={key}
            agent={agent}
            onEdit={handleEditAgent}
            onDelete={agent.id in customAgents ? handleDeleteAgent : undefined}
          />
        ))}
      </div>

      <AgentBuilder open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddAgent={handleAddAgent} />
    </div>
  )
}
