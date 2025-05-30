"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Server } from "lucide-react"

interface AgentMCPServersPopoverProps {
  servers: { id: string; name: string }[]
}

export function AgentMCPServersPopover({ servers }: AgentMCPServersPopoverProps) {
  if (!servers || servers.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="bg-secondary/80 hover:bg-secondary/90 border hover:cursor-pointer"
          title={`MCP Servers (${servers.length})`}
        >
          <Server className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-2">
          <h4 className="font-medium">MCP Servers ({servers.length})</h4>
          <div className="flex max-w-[250px] flex-wrap gap-2">
            {servers.map((server) => (
              <div key={server.id} className="bg-secondary/40 text-foreground rounded-md px-2 py-1 text-xs">
                {server.name}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
