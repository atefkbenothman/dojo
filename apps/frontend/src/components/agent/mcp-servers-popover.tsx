"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { useQuery } from "convex/react"
import { Server } from "lucide-react"

export function AgentMCPServersPopover({ serverIds }: { serverIds: Id<"mcp">[] }) {
  if (serverIds.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="bg-secondary/80 hover:bg-secondary/90 border hover:cursor-pointer"
          title={`MCP Servers (${serverIds.length})`}
        >
          <Server className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-2">
          <h4 className="font-medium">MCP Servers ({serverIds.length})</h4>
          <div className="flex max-w-[250px] flex-wrap gap-2">
            {serverIds.map((serverId) => {
              const server = useQuery(api.mcp.get, { id: serverId as Id<"mcp"> })
              return (
                <div key={serverId} className="bg-secondary/40 text-foreground rounded-md px-2 py-1 text-xs">
                  {server?.name}
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
