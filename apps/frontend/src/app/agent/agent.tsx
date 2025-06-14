"use client"

import { AddAgentCard } from "@/components/agent/add-agent-card"
import { AgentCard } from "@/components/agent/agent-card"
import { Input } from "@/components/ui/input"
import { useAgent } from "@/hooks/use-agent"
import type { Agent } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { useEffect, useState } from "react"

export function Agent() {
  const { agents } = useAgent()
  const { isAuthenticated } = useConvexAuth()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>(agents)

  useEffect(() => {
    const filtered =
      searchInput === ""
        ? agents
        : agents.filter((agent) => agent.name.toLowerCase().includes(searchInput.toLowerCase()))
    setFilteredAgents(filtered)
  }, [searchInput, agents])

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-4 sticky top-0 z-30 bg-background">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Agents</p>
          <p className="text-xs text-muted-foreground">create and run custom agents</p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Input
            placeholder="Search"
            className="ring-none bg-input/30 h-10 resize-none border-border focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border w-[16rem] text-xs"
            onChange={(e) => setSearchInput(e.target.value)}
            value={searchInput}
          />
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-4 px-4 pb-4">
        <AddAgentCard isAuthenticated={isAuthenticated} />
        {filteredAgents.map((agent) => (
          <AgentCard key={agent._id} agent={agent} isAuthenticated={isAuthenticated} />
        ))}
      </div>
    </div>
  )
}
