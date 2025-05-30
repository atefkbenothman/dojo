"use client"

import { AddAgentCard } from "@/components/agent/add-agent-card"
import { AgentCard } from "@/components/agent/agent-card"
import { Input } from "@/components/ui/input"
import { useAgentProvider } from "@/hooks/use-agent"
import type { AgentConfig } from "@dojo/config"
import { useEffect, useState } from "react"

export function Agent() {
  const { allAvailableAgents } = useAgentProvider()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredAgents, setFilteredAgents] = useState<Record<string, AgentConfig>>(allAvailableAgents)

  useEffect(() => {
    const filtered =
      searchInput === ""
        ? allAvailableAgents
        : Object.fromEntries(
            Object.entries(allAvailableAgents).filter(([, agent]) =>
              agent.name.toLowerCase().startsWith(searchInput.toLowerCase()),
            ),
          )
    setFilteredAgents(filtered)
  }, [searchInput, allAvailableAgents])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Input
          placeholder="Search Agents..."
          className="ring-none bg-input h-10 resize-none border focus-visible:ring-transparent w-[16rem] text-xs"
          onChange={(e) => setSearchInput(e.target.value)}
          value={searchInput}
        />
      </div>
      <div className="flex flex-row flex-wrap gap-4">
        <AddAgentCard />
        {Object.entries(filteredAgents).map(([key, agent]) => (
          <AgentCard key={key} agent={agent} />
        ))}
      </div>
    </div>
  )
}
