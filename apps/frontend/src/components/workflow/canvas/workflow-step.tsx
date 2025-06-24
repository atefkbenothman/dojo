"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useMCP } from "@/hooks/use-mcp"
import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import {
  ChevronDown,
  Copy,
  GripVertical,
  Trash,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Pencil,
  FileText,
} from "lucide-react"
import { DragEvent, useState, memo, useCallback, useEffect, useMemo } from "react"

interface WorkflowStepProps {
  step: Agent
  stepNumber: number
  modelName?: string
  onRemove?: () => void
  onDuplicate?: () => void
  onEdit?: () => void
  onViewLogs?: () => void
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: (e: DragEvent) => void
  onDragEnd?: (e: DragEvent) => void
  onDragOver?: (e: DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: DragEvent) => void
  isExpanded?: boolean
  // Execution state props
  executionStatus?: "pending" | "connecting" | "running" | "completed" | "failed"
  isCurrentStep?: boolean
  executionDuration?: number
  executionError?: string
}

export const WorkflowStep = memo(function WorkflowStep({
  step,
  stepNumber,
  modelName,
  onRemove,
  onDuplicate,
  onEdit,
  onViewLogs,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isExpanded: globalIsExpanded,
  executionStatus,
  isCurrentStep = false,
  executionDuration,
  executionError,
}: WorkflowStepProps) {
  const { mcpServers } = useMCP()

  const [localIsExpanded, setLocalIsExpanded] = useState(false)
  const [hasLocalOverride, setHasLocalOverride] = useState(false)

  const requiredServerNames = useMemo(
    () =>
      step.mcpServers
        .map((id) => mcpServers?.find((s) => s._id === id)?.name)
        .filter((name): name is string => name !== undefined),
    [step.mcpServers, mcpServers],
  )

  // Use local state if user has clicked individually, otherwise use global state
  const isExpanded = hasLocalOverride ? localIsExpanded : (globalIsExpanded ?? false)

  // Reset local override when global state changes
  useEffect(() => {
    if (globalIsExpanded !== undefined) {
      setHasLocalOverride(false)
    }
  }, [globalIsExpanded])

  // Helper functions for execution status
  const getExecutionStatusIcon = () => {
    if (!executionStatus) return null

    const iconClass = "h-3 w-3"

    switch (executionStatus) {
      case "completed":
        return <CheckCircle className={cn(iconClass, "text-green-500")} />
      case "failed":
        return <XCircle className={cn(iconClass, "text-red-500")} />
      case "running":
        return <Loader2 className={cn(iconClass, "text-blue-500 animate-spin")} />
      case "connecting":
        return <Loader2 className={cn(iconClass, "text-orange-500 animate-spin")} />
      case "pending":
        return <Clock className={cn(iconClass, "text-gray-400")} />
      default:
        return null
    }
  }

  const getExecutionBorderColor = () => {
    if (!executionStatus && !isCurrentStep) return ""

    switch (executionStatus) {
      case "completed":
        return "border-green-500/40 border-2"
      case "failed":
        return "border-red-500/40 border-2"
      case "running":
        return "border-blue-500 border-2"
      case "connecting":
        return "border-orange-500 border-2"
      default:
        return ""
    }
  }

  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`
    const seconds = Math.round(duration / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setHasLocalOverride(true)
      setLocalIsExpanded(!isExpanded)
    },
    [isExpanded],
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

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onEdit?.()
    },
    [onEdit],
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

      {/* Step number badge - minimal style outside card */}
      <div
        className={cn(
          "absolute left-0 -translate-x-full -ml-2.5 top-2 z-10 flex items-center justify-center h-6 w-6 border bg-background text-xs font-medium",
          executionStatus === "completed" && "border-green-500/40 text-green-600 dark:text-green-400",
          executionStatus === "failed" && "border-red-500/40 text-red-600 dark:text-red-400",
          executionStatus === "running" && "border-blue-500 text-blue-600 dark:text-blue-400",
          executionStatus === "connecting" && "border-orange-500 text-orange-600 dark:text-orange-400",
          executionStatus === "pending" && "text-gray-400",
        )}
      >
        {executionStatus === "completed" ? "✓" : executionStatus === "failed" ? "✗" : stepNumber}
      </div>

      {/* Execution duration badge - positioned below step number */}
      {executionDuration && executionStatus === "completed" && (
        <div className="absolute left-0 -translate-x-full -ml-2.5 top-10 z-10 flex items-center justify-center h-6 px-2 border border-green-500/40 bg-background text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
          {formatDuration(executionDuration)}
        </div>
      )}
      {executionStatus === "running" && (
        <div className="absolute left-0 -translate-x-full -ml-2.5 top-10 z-10 flex items-center justify-center h-6 px-2 border border-blue-500 bg-background text-xs font-medium text-blue-600 dark:text-blue-400 animate-pulse whitespace-nowrap">
          Running
        </div>
      )}
      {executionStatus === "connecting" && (
        <div className="absolute left-0 -translate-x-full -ml-2.5 top-10 z-10 flex items-center justify-center h-6 px-2 border border-orange-500 bg-background text-xs font-medium text-orange-600 dark:text-orange-400 animate-pulse whitespace-nowrap">
          {requiredServerNames.length > 0 
            ? `Connecting ${requiredServerNames.length} ${requiredServerNames.length === 1 ? "server" : "servers"}`
            : "Connecting"
          }
        </div>
      )}
      {executionStatus === "failed" && (
        <div className="absolute left-0 -translate-x-full -ml-2.5 top-10 z-10 flex items-center justify-center h-6 px-2 border border-red-500/40 bg-background text-xs font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
          Failed
        </div>
      )}

      <Card
        className={cn(
          "transition-all cursor-move relative p-0",
          isDragging && "opacity-50",
          isDragOver && "ring-2 ring-primary",
          getExecutionBorderColor(),
        )}
      >
        {/* Running Progress Bar - thinner */}
        {executionStatus === "running" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-b-lg">
            <div className="h-full w-full bg-blue-500 animate-pulse" />
          </div>
        )}

        {/* Main content wrapper */}
        <div className="overflow-hidden h-full flex flex-col">
          {/* Collapsed view - always visible with fixed height */}
          <div className="flex flex-col h-[120px]">
            <div className="flex flex-col h-full p-2">
              {/* Main content area */}
              <div className="flex items-start gap-1.5 flex-1 p-2">
                {/* Drag handle */}
                <div className="mt-0.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  <GripVertical className="h-3 w-3" />
                </div>

                {/* Step content - tighter spacing */}
                <div className="flex-1 min-w-0">
                  {/* Primary: Agent name with execution status */}
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-medium leading-none text-foreground">{step.name}</h4>
                    {executionStatus && getExecutionStatusIcon()}
                  </div>

                  {/* Secondary: Metadata in a compact layout */}
                  <div className="mt-1">
                    {/* First row: Output type and model */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                          "bg-secondary/80 text-secondary-foreground",
                        )}
                      >
                        {step.outputType === "object" ? "JSON" : "Text"}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground truncate text-xs">{modelName || "No model"}</span>
                      {requiredServerNames.length > 0 && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {requiredServerNames.length} {requiredServerNames.length === 1 ? "tool" : "tools"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons - separate row */}
              <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t">
                {executionStatus && executionStatus !== "pending" && onViewLogs && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground border-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewLogs()
                    }}
                    title="View logs"
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground border-muted-foreground/20"
                  onClick={handleDuplicate}
                  title="Duplicate step"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:border-destructive/50 border-muted-foreground/20"
                  onClick={handleRemove}
                  title="Remove step"
                >
                  <Trash className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground border-muted-foreground/20"
                  onClick={handleEdit}
                  title="Edit step"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground border-muted-foreground/20"
                  onClick={handleToggleExpand}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  <ChevronDown
                    className={cn("h-3 w-3 transition-transform duration-200", isExpanded && "rotate-180")}
                  />
                </Button>
              </div>
            </div>
          </div>

          {/* Expanded view - appears below the fixed collapsed view */}
          {isExpanded && (
            <div className="border-t">
              <div className="px-2 py-2 space-y-1.5">
                {/* System Prompt */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    System Prompt
                  </label>
                  <div className="text-[11px] bg-muted/30 rounded-md p-1.5 max-h-20 overflow-y-auto text-muted-foreground">
                    {step.systemPrompt || "No system prompt defined"}
                  </div>
                </div>

                {/* Output Type */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Output Type
                  </label>
                  <div className="text-[11px]">
                    {step.outputType === "object" ? "Structured JSON Output" : "Text Output"}
                  </div>
                </div>

                {/* AI Model */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    AI Model
                  </label>
                  <div className="text-[11px] font-medium">{modelName || step.aiModelId}</div>
                </div>

                {/* MCP Servers */}
                {requiredServerNames.length > 0 && (
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Required Tools ({requiredServerNames.length})
                      {executionStatus === "connecting" && (
                        <span className="text-orange-600 dark:text-orange-400 ml-1">- Connecting...</span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-0.5">
                      {requiredServerNames.map((name) => (
                        <div 
                          key={name} 
                          className={cn(
                            "text-[10px] rounded-md px-1 py-0.5",
                            executionStatus === "connecting" 
                              ? "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 animate-pulse"
                              : "bg-muted/30"
                          )}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-muted-foreground italic">
                      {executionStatus === "connecting" 
                        ? "Establishing connections to MCP servers..."
                        : "Auto-connected during workflow execution"
                      }
                    </div>
                  </div>
                )}

                {/* Execution Error */}
                {executionError && (
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-red-600 uppercase tracking-wider">
                      Execution Error
                    </label>
                    <div className="text-[11px] bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-1.5 text-red-800 dark:text-red-200">
                      {executionError}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
})
