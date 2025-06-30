"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { FileText, Pencil } from "lucide-react"
import { memo } from "react"
import { Handle, Position, NodeProps } from "reactflow"

// Instructions Node Data
interface InstructionsNodeData {
  instructions?: string
  onEditClick?: () => void
}

interface InstructionsNodeProps extends NodeProps<InstructionsNodeData> {}

// Instructions Card Component
interface InstructionsCardProps {
  instructions?: string
  onEditClick?: () => void
  selected: boolean
}

const InstructionsCard = memo(function InstructionsCard({
  instructions,
  onEditClick,
  selected,
}: InstructionsCardProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium leading-none text-foreground">Workflow Instructions</h4>
        </div>
        {onEditClick && selected && (
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground border-muted-foreground/20"
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

      {/* Instructions textarea */}
      <Textarea
        value={instructions || "Edit your workflow instructions here"}
        readOnly
        className="h-[120px] max-h-[300px] resize-none text-xs bg-muted/30 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default overflow-y-auto"
        placeholder="No instructions provided"
      />
    </>
  )
})

// Instructions Node Component
export const InstructionsNode = memo(function InstructionsNode({ data, selected }: InstructionsNodeProps) {
  return (
    <>
      <Card
        className={cn(
          "w-[280px] overflow-hidden",
          "border-2 border-dashed border-muted-foreground/25",
          "bg-background/95 backdrop-blur p-0",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        {/* Instructions badge */}
        <div className="absolute left-0 -translate-x-full -ml-2.5 top-2 z-10 flex items-center justify-center h-6 w-6 border bg-background rounded-full">
          <FileText className="h-3 w-3 text-muted-foreground" />
        </div>

        <div className="p-4">
          <InstructionsCard instructions={data.instructions} onEditClick={data.onEditClick} selected={selected} />
        </div>
      </Card>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "hsl(var(--muted-foreground))",
          width: 10,
          height: 10,
          border: "2px solid hsl(var(--background))",
          boxShadow: "0 0 0 2px hsl(var(--border))",
          transition: "all 0.2s ease",
        }}
      />
    </>
  )
})
