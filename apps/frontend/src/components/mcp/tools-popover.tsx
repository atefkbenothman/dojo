"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { Wrench } from "lucide-react"

interface ToolsPopoverProps {
  tools: Record<string, unknown>
}

export function ToolsPopover({ tools }: ToolsPopoverProps) {
  const { play } = useSoundEffectContext()

  const toolNames = Object.keys(tools)
  if (toolNames.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="bg-secondary/80 hover:bg-secondary/90 border hover:cursor-pointer"
          title={`Tools (${toolNames.length})`}
          onMouseDown={() => play("./sounds/click.mp3", { volume: 0.5 })}
        >
          <Wrench className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-2">
          <h4 className="font-medium">Available Tools ({toolNames.length})</h4>
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
