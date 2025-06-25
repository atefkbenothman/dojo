"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Pencil } from "lucide-react"
import { memo } from "react"

interface WorkflowInstructionsStepProps {
  instructions: string
  isExpanded?: boolean // Keep for compatibility but won't be used
  onEditClick?: () => void
}

export const WorkflowInstructionsStep = memo(function WorkflowInstructionsStep({
  instructions,
  onEditClick,
}: WorkflowInstructionsStepProps) {
  return (
    <div className="relative w-[280px] mx-auto">
      {/* Instructions badge - similar style to step number badge */}
      <div className="absolute left-0 -translate-x-full -ml-2.5 top-2 z-10 flex items-center justify-center h-6 w-6 border bg-background">
        <FileText className="h-3 w-3 text-muted-foreground" />
      </div>

      <Card className="transition-all relative p-0 border-2 border-dashed border-muted-foreground/25">
        {/* Main content wrapper */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className="text-sm font-medium leading-none text-foreground">Prompt</h4>
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
            value={instructions || "Edit your prompt here"}
            readOnly
            className="h-[100px] max-h-[300px] resize-y text-xs bg-muted/30 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default overflow-y-auto"
            placeholder="No instructions provided"
          />
        </div>
      </Card>
    </div>
  )
})
