"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Wrench } from "lucide-react"

interface ToolsPopoverProps {
  tools: Record<string, unknown>
}

export function ToolsPopover({ tools }: ToolsPopoverProps) {
  const toolNames = Object.keys(tools)
  if (toolNames.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-8 hover:cursor-pointer"
          title={`Tools (${toolNames.length})`}
        >
          <Wrench className="h-2.5 w-2.5 text-foreground/90" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Available Tools ({toolNames.length})</h4>
          <div className="flex max-w-[250px] flex-wrap gap-2">
            {toolNames.map((toolName) => (
              <div key={toolName} className="bg-secondary/40 text-foreground rounded-md px-2 py-1 text-xs">
                {toolName}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
