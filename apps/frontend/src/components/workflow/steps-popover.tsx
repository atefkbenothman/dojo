"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { Workflow } from "@dojo/db/convex/types"
import { Layers } from "lucide-react"

interface StepsPopoverProps {
  workflow: Workflow
}

export function StepsPopover({ workflow }: StepsPopoverProps) {
  const { agents } = useAgent()
  const { models } = useAIModels()

  const stepAgents = workflow.steps
    .map((stepId) => agents.find((a) => a._id === stepId))
    .filter((agent) => agent !== undefined)

  if (stepAgents.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="bg-secondary/80 hover:bg-secondary/90 border hover:cursor-pointer"
          title={`Steps (${stepAgents.length})`}
        >
          <Layers className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-2">
          <h4 className="font-medium">Workflow Steps ({stepAgents.length})</h4>
          <div className="flex flex-col gap-2 max-w-[300px]">
            {stepAgents.map((agent, index) => {
              const model = models.find((m) => m._id === agent?.aiModelId)
              return (
                <div
                  key={agent?._id || index}
                  className="bg-secondary/40 text-foreground rounded-md px-2 py-1 text-xs flex items-center justify-between gap-2"
                >
                  <span>
                    Step {index + 1}: {agent?.name || "Unknown"}
                  </span>
                  {model && (
                    <Badge variant="outline" className="text-xs">
                      {model.name}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
