"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import { Handle, Position } from "@xyflow/react"
import { FileText, Pencil, Plus } from "lucide-react"
import { memo, useCallback } from "react"

// Instructions Node Data
export interface InstructionsNodeData {
  instructions?: string
  onEditClick?: () => void
  onAddStepToInstructions?: (agent: Agent) => void
  agents?: Agent[]
  getModel?: (modelId: string) => { name: string } | undefined
}

export interface InstructionsNodeProps {
  data: InstructionsNodeData
  selected?: boolean
  id: string
}

// Instructions Card Component
interface InstructionsCardProps {
  instructions?: string
  onEditClick?: () => void
  onAddStepToInstructions?: (agent: Agent) => void
  agents?: Agent[]
  getModel?: (modelId: string) => { name: string } | undefined
  selected?: boolean
}

const InstructionsCard = memo(function InstructionsCard({
  instructions,
  onEditClick,
  onAddStepToInstructions,
  agents,
  getModel,
  selected = false,
}: InstructionsCardProps) {
  const handleAddStepToInstructions = useCallback(
    (agent: Agent) => {
      onAddStepToInstructions?.(agent)
    },
    [onAddStepToInstructions],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header - similar to dialog header */}
      <div className="p-4 border-b-[2px] bg-muted flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-semibold text-foreground">Workflow Instructions</h4>
        </div>

        {/* Action buttons in header */}
        <div className="flex items-center gap-1">
          {/* Edit button */}
          {onEditClick && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground border border-border"
              onClick={(e) => {
                e.stopPropagation()
                onEditClick()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Edit workflow metadata"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="h-full min-h-0 bg-background">
        <Textarea
          value={instructions || "Edit your workflow instructions here"}
          readOnly
          className="w-full min-h-[170px] max-h-[170px] text-xs resize-none bg-muted/30 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-text overflow-y-auto nodrag nopan nowheel"
          placeholder="No instructions provided"
        />
      </div>

      {/* Footer - similar to dialog pattern */}
      {onAddStepToInstructions && agents && agents.length > 0 && (
        <div className="p-2 border-t-[2px] bg-muted">
          <AgentSelectorPopover
            agents={agents}
            onSelect={handleAddStepToInstructions}
            getModel={getModel}
            trigger={
              <Button
                variant="default"
                className="w-full hover:cursor-pointer bg-primary/90"
                title="Add step with agent"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add step
              </Button>
            }
          />
        </div>
      )}
    </div>
  )
})

// Instructions Node Component
export const InstructionsNode = memo(function InstructionsNode({ data, selected = false }: InstructionsNodeProps) {
  return (
    <>
      <Card
        className={cn(
          "w-[360px] h-[260px] overflow-hidden relative p-0",
          "border-2 border-primary/20 border-dashed",
          "bg-background/95 backdrop-blur",
          selected && "ring-2 ring-primary/80",
        )}
      >
        <InstructionsCard
          instructions={data.instructions}
          onEditClick={data.onEditClick}
          onAddStepToInstructions={data.onAddStepToInstructions}
          agents={data.agents}
          getModel={data.getModel}
          selected={selected}
        />
      </Card>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "hsl(var(--primary))",
          width: 10,
          height: 10,
          border: "2px solid hsl(var(--background))",
          boxShadow: "0 0 0 2px hsl(var(--primary))",
          transition: "all 0.2s ease",
        }}
      />
    </>
  )
})
