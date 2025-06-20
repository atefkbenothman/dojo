"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import { ChevronDown, Copy, GripVertical, Trash } from "lucide-react"
import { DragEvent, useState, memo, useCallback, useEffect } from "react"

interface WorkflowStepProps {
  step: Agent
  stepNumber: number
  modelName?: string
  onRemove?: () => void
  onConfigure?: () => void
  onDuplicate?: () => void
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: (e: DragEvent) => void
  onDragEnd?: (e: DragEvent) => void
  onDragOver?: (e: DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: DragEvent) => void
  isExpanded?: boolean
}

export const WorkflowStep = memo(function WorkflowStep({
  step,
  stepNumber,
  modelName,
  onRemove,
  onConfigure,
  onDuplicate,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isExpanded: globalIsExpanded,
}: WorkflowStepProps) {
  const [localIsExpanded, setLocalIsExpanded] = useState(false)
  const [hasLocalOverride, setHasLocalOverride] = useState(false)

  // Use local state if user has clicked individually, otherwise use global state
  const isExpanded = hasLocalOverride ? localIsExpanded : globalIsExpanded ?? false

  // Reset local override when global state changes
  useEffect(() => {
    if (globalIsExpanded !== undefined) {
      setHasLocalOverride(false)
    }
  }, [globalIsExpanded])

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setHasLocalOverride(true)
    setLocalIsExpanded(!isExpanded)
  }, [isExpanded])

  const handleConfigure = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onConfigure?.()
    },
    [onConfigure],
  )

  const handleDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDuplicate?.()
    },
    [onDuplicate],
  )

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onRemove?.()
    },
    [onRemove],
  )

  return (
    <div
      className="relative w-[280px] mx-auto"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop indicator */}
      {isDragOver && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary" />}

      {/* Step number badge - adjusted for centered layout */}
      <div className="absolute -left-10 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {stepNumber}
      </div>

      <Card
        className={cn(
          "transition-all cursor-move relative h-[100px]",
          isDragging && "opacity-50",
          isDragOver && "ring-2 ring-primary",
          isExpanded && "h-[400px]",
        )}
      >
        {/* Main content wrapper */}
        <div className="overflow-hidden h-full pb-9">
          {/* Collapsed view - always visible */}
          <div className="p-2">
            {/* Main content area */}
            <div className="flex items-start">
              {/* Drag handle */}
              <div className="mt-0.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Step content - better spacing */}
              <div className="flex-1 min-w-0 space-y-1 ml-2">
                {/* Primary: Agent name */}
                <h4 className="text-base font-semibold leading-none text-foreground">{step.name}</h4>

                {/* Secondary: Metadata in a more spacious layout */}
                <div className="space-y-0.5">
                  {/* First row: Output type and model */}
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0 rounded text-xs font-medium",
                        step.outputType === "object"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
                      )}
                    >
                      {step.outputType === "object" ? "JSON" : "Text"}
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-muted-foreground text-xs truncate">{modelName || "No model"}</span>
                  </div>

                  {/* Second row: Tools if they exist */}
                  {step.mcpServers.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {step.mcpServers.length} {step.mcpServers.length === 1 ? "tool" : "tools"} connected
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Expanded view - animated, appears below collapsed content */}
          <div className={cn("transition-all duration-200 ease-in-out border-t", isExpanded ? "block" : "hidden")}>
            <div className="px-2 pt-2 space-y-2 overflow-y-auto h-[280px]">
              {/* System Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  System Prompt
                </label>
                <div className="text-sm bg-muted/30 rounded-md p-2 max-h-32 overflow-y-auto font-mono text-muted-foreground">
                  {step.systemPrompt || "No system prompt defined"}
                </div>
              </div>

              {/* Output Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Output Type
                </label>
                <div className="text-sm">{step.outputType === "object" ? "Structured JSON Output" : "Text Output"}</div>
              </div>

              {/* AI Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Model</label>
                <div className="text-sm font-medium">{modelName || step.aiModelId}</div>
              </div>

              {/* MCP Servers */}
              {step.mcpServers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Connected Tools ({step.mcpServers.length})
                  </label>
                  <div className="text-sm text-muted-foreground">
                    {step.mcpServers.length} MCP {step.mcpServers.length === 1 ? "server" : "servers"} providing tools
                  </div>
                </div>
              )}

              {/* Visibility */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Visibility</label>
                <div className="text-sm flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                      step.isPublic
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                    )}
                  >
                    {step.isPublic ? "Public" : "Private"}
                  </span>
                </div>
              </div>

              {/* Configure button */}
              <div className="pt-2 border-t">
                <Button variant="outline" size="sm" className="w-full" onClick={handleConfigure}>
                  Configure Agent
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions row - absolutely positioned at bottom, stays in place */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-background border-t z-10">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleDuplicate}
              title="Duplicate step"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
              title="Remove step"
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleToggleExpand}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isExpanded && "rotate-180")} />
          </Button>
        </div>
      </Card>
    </div>
  )
})
