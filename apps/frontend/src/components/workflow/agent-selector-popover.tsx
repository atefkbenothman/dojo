"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Agent } from "@dojo/db/convex/types"
import { Plus, Search } from "lucide-react"
import { useState, memo, useCallback, useMemo } from "react"

interface AgentSelectorPopoverProps {
  agents: Agent[]
  onSelect: (agent: Agent) => void
  trigger?: React.ReactNode
}

export const AgentSelectorPopover = memo(function AgentSelectorPopover({
  agents,
  onSelect,
  trigger,
}: AgentSelectorPopoverProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredAgents = useMemo(
    () => agents.filter((agent) => agent.name.toLowerCase().includes(search.toLowerCase())),
    [agents, search],
  )

  const handleSelect = useCallback(
    (agent: Agent) => {
      onSelect(agent)
      setOpen(false)
      setSearch("")
    },
    [onSelect],
  )

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 gap-2 bg-background">
            <Plus className="h-3.5 w-3.5" />
            Add step
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="center">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search agents..." value={search} onChange={handleSearchChange} className="h-9 pl-8" />
          </div>
        </div>
        <div className="h-[300px] overflow-y-auto">
          <div className="p-2">
            {filteredAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {search ? "No agents found" : "No agents available"}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredAgents.map((agent) => (
                  <Button
                    key={agent._id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleSelect(agent)}
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">{agent.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {agent.outputType === "object" ? "JSON" : "Text"} output • {agent.mcpServers.length} tools
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})
