"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useStableQuery } from "@/hooks/use-stable-query"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Server } from "lucide-react"

export function MCPServersPopover({ serverIds }: { serverIds: Id<"mcp">[] }) {
  const servers = useStableQuery(api.mcp.list)
  const serverNames = serverIds
    .map((id) => servers?.find((s) => s._id === id)?.name)
    .filter((name) => name !== undefined)

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
          <h4 className="text-sm">MCP Servers ({serverIds.length})</h4>
          <div className="flex max-w-[250px] flex-wrap gap-2">
            {serverNames.map((name) => {
              return (
                <div key={name} className="bg-secondary/40 text-foreground rounded-md px-2 py-1 text-xs">
                  {name}
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
