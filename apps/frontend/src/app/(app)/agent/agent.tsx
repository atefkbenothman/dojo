"use client"

import { AddAgentCard } from "@/components/agent/add-agent-card"
import { AgentCard } from "@/components/agent/agent-card"
import { AgentDialog } from "@/components/agent/agent-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAgent } from "@/hooks/use-agent"
import type { Agent } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { Search } from "lucide-react"
import { useEffect, useState } from "react"

export function Agent() {
  const { agents, stopAllAgents, getRunningExecutions } = useAgent()
  const { isAuthenticated } = useConvexAuth()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>(agents)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Track running agents count using Convex executions
  const runningExecutions = getRunningExecutions()
  const runningCount = runningExecutions.length

  useEffect(() => {
    const filtered =
      searchInput === ""
        ? agents
        : agents.filter((agent) => agent.name.toLowerCase().includes(searchInput.toLowerCase()))
    setFilteredAgents(filtered)
  }, [searchInput, agents])

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setIsDialogOpen(true)
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-4 sticky top-0 z-30 bg-background">
        <div className="flex flex-col gap-1 border-b pb-4 -my-4 py-4 -mx-4 px-4">
          <p className="text-sm font-medium">Agents</p>
          <p className="text-xs text-muted-foreground">build and run custom agents</p>
        </div>
        <div className="flex flex-row items-center gap-4 flex-nowrap border-b pb-4 -mx-4 px-4 py-4">
          <div className="relative min-w-0 flex-1 max-w-[24rem]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search"
              className="ring-none bg-input/30 h-10 resize-none border-border focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border pl-10 text-xs"
              onChange={(e) => setSearchInput(e.target.value)}
              value={searchInput}
            />
          </div>
          <Button
            variant="outline"
            className="hover:cursor-pointer h-10 whitespace-nowrap flex-shrink-0"
            onClick={stopAllAgents}
            disabled={runningCount === 0}
            title="Stop all running agents"
          >
            Stop All
          </Button>
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-4 px-4 pb-4">
        <AddAgentCard isAuthenticated={isAuthenticated} />
        {filteredAgents.map((agent) => (
          <AgentCard key={agent._id} agent={agent} isAuthenticated={isAuthenticated} onEditClick={handleEditAgent} />
        ))}
      </div>
      {/* Single dialog instance for all cards */}
      {selectedAgent && (
        <AgentDialog
          mode="edit"
          agent={selectedAgent}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  )
}
