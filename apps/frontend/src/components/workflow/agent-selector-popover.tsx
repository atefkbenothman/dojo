"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import { Plus, Search, Bot } from "lucide-react"
import { useState, memo, useCallback, useMemo } from "react"

interface AgentSelectorPopoverProps {
  agents: Agent[]
  onSelect: (agent: Agent) => void
  trigger?: React.ReactNode
  getModel?: (modelId: string) => { name: string } | undefined
}

export const AgentSelectorPopover = memo(function AgentSelectorPopover({
  agents,
  onSelect,
  trigger,
  getModel,
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
      <PopoverContent className="w-[520px] p-0" align="center" side="right" sideOffset={8}>
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={search}
              onChange={handleSearchChange}
              className="h-9 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <div className="h-[400px] overflow-y-auto no-scrollbar">
          <div className="p-3">
            {filteredAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Bot className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {search ? "No agents found" : "No agents available"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Try a different search term" : "Create an agent to get started"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredAgents.map((agent) => (
                  <Card
                    key={agent._id}
                    className={cn(
                      "p-3 cursor-pointer transition-all",
                      "hover:bg-muted/50 hover:border-primary/50",
                      "border-2",
                    )}
                    onClick={() => handleSelect(agent)}
                  >
                    <div className="space-y-2">
                      {/* Agent name */}
                      <div className="font-medium text-sm text-foreground line-clamp-1">{agent.name}</div>

                      {/* Metadata badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Output type badge */}
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium",
                            "bg-secondary/80 text-secondary-foreground",
                          )}
                        >
                          {agent.outputType === "object" ? "JSON" : "Text"}
                        </span>

                        {/* Tools count */}
                        {agent.mcpServers.length > 0 && (
                          <span
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium",
                              "bg-secondary/80 text-secondary-foreground",
                            )}
                          >
                            {agent.mcpServers.length} {agent.mcpServers.length === 1 ? "tool" : "tools"}
                          </span>
                        )}

                        {/* AI Model */}
                        {getModel && (
                          <span
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium",
                              "bg-secondary/80 text-secondary-foreground",
                            )}
                          >
                            {getModel(agent.aiModelId)?.name || "Unknown Model"}
                          </span>
                        )}
                      </div>

                      {/* System prompt preview */}
                      {agent.systemPrompt && (
                        <div className="text-[11px] text-muted-foreground line-clamp-2">{agent.systemPrompt}</div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})
