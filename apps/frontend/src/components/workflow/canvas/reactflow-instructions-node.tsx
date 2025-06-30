"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Pencil } from "lucide-react"
import { memo } from "react"
import { Handle, Position, NodeProps } from "reactflow"

interface InstructionsNodeData {
  instructions: string
  onEditClick?: () => void
}

export const ReactFlowInstructionsNode = memo(function ReactFlowInstructionsNode({
  data,
}: NodeProps<InstructionsNodeData>) {
  const { instructions, onEditClick } = data

  return (
    <div className="relative">
      <Card className="react-flow-instructions-node transition-all relative p-0 border-2 border-dashed border-muted-foreground/25 bg-background/95 backdrop-blur">
        {/* Instructions badge - similar style to step number badge */}
        <div className="absolute left-0 -translate-x-full -ml-2.5 top-2 z-10 flex items-center justify-center h-6 w-6 border bg-background rounded-full">
          <FileText className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Main content wrapper */}
        <div className="p-4 w-[320px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium leading-none text-foreground">Workflow Instructions</h4>
            </div>
            {onEditClick && (
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground border-muted-foreground/20"
                onClick={onEditClick}
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
        </div>
      </Card>

      {/* Output handle - connects to the first workflow steps */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-muted-foreground border-2 border-background"
        style={{ bottom: -6 }}
      />
    </div>
  )
})
