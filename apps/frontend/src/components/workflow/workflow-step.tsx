"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import { ChevronDown, Copy, GripVertical, Trash, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"
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
  // Execution state props
  executionStatus?: "pending" | "running" | "completed" | "failed"
  isCurrentStep?: boolean
  executionDuration?: number
  executionError?: string
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
  executionStatus,
  isCurrentStep = false,
  executionDuration,
  executionError,
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

  // Helper functions for execution status
  const getExecutionStatusIcon = () => {
    if (!executionStatus) return null
    
    const iconClass = "h-4 w-4"
    
    switch (executionStatus) {
      case "completed":
        return <CheckCircle className={cn(iconClass, "text-green-500")} />
      case "failed":
        return <XCircle className={cn(iconClass, "text-red-500")} />
      case "running":
        return <Loader2 className={cn(iconClass, "text-blue-500 animate-spin")} />
      case "pending":
        return <Clock className={cn(iconClass, "text-gray-400")} />
      default:
        return null
    }
  }

  const getExecutionBorderColor = () => {
    if (!executionStatus && !isCurrentStep) return ""
    
    if (isCurrentStep && executionStatus === "running") {
      return "border-blue-500 shadow-blue-200 shadow-lg"
    }
    
    switch (executionStatus) {
      case "completed":
        return "border-green-500"
      case "failed":
        return "border-red-500"
      case "running":
        return "border-blue-500 shadow-blue-200 shadow-lg"
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

      {/* Step number badge - adjusted for centered layout with execution state */}
      <div className={cn(
        "absolute -left-10 top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium transition-all",
        !executionStatus && "bg-muted text-muted-foreground",
        executionStatus === "pending" && "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
        executionStatus === "running" && "bg-blue-500 text-white animate-pulse",
        executionStatus === "completed" && "bg-green-500 text-white",
        executionStatus === "failed" && "bg-red-500 text-white"
      )}>
        {executionStatus === "completed" ? "✓" : 
         executionStatus === "failed" ? "✗" : 
         stepNumber}
      </div>

      <Card
        className={cn(
          "transition-all cursor-move relative h-[100px]",
          isDragging && "opacity-50",
          isDragOver && "ring-2 ring-primary",
          isExpanded && "h-[400px]",
          getExecutionBorderColor(),
          isCurrentStep && "ring-2 ring-blue-300 ring-opacity-50",
        )}
      >
        {/* Execution Status Overlay */}
        {executionStatus && (
          <div className={cn(
            "absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            executionStatus === "completed" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            executionStatus === "failed" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
            executionStatus === "running" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            executionStatus === "pending" && "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          )}>
            {getExecutionStatusIcon()}
            <span className="capitalize">{executionStatus}</span>
            {executionDuration && executionStatus === "completed" && (
              <span className="text-xs opacity-75">• {formatDuration(executionDuration)}</span>
            )}
          </div>
        )}

        {/* Current Step Pulse Animation */}
        {isCurrentStep && executionStatus === "running" && (
          <div className="absolute inset-0 rounded-lg pointer-events-none">
            <div className="absolute inset-0 rounded-lg bg-blue-500 opacity-10 animate-pulse" />
            {/* Animated border effect */}
            <div className="absolute inset-0 rounded-lg border-2 border-blue-500 animate-ping opacity-30" />
          </div>
        )}

        {/* Running Progress Bar */}
        {executionStatus === "running" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-b-lg">
            <div className="h-full w-full bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 animate-pulse" />
          </div>
        )}

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

                  {/* Second row: Tools and execution timing */}
                  <div className="flex items-center justify-between">
                    {step.mcpServers.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {step.mcpServers.length} {step.mcpServers.length === 1 ? "tool" : "tools"} connected
                      </div>
                    )}
                    {executionDuration && executionStatus === "completed" && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {formatDuration(executionDuration)}
                      </div>
                    )}
                    {executionStatus === "running" && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                        Running...
                      </div>
                    )}
                    {executionStatus === "failed" && (
                      <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Failed
                      </div>
                    )}
                  </div>
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

              {/* Execution Status */}
              {executionStatus && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Execution Status
                  </label>
                  <div className="flex items-center gap-2">
                    {getExecutionStatusIcon()}
                    <span className={cn(
                      "text-sm font-medium capitalize",
                      executionStatus === "completed" && "text-green-600 dark:text-green-400",
                      executionStatus === "failed" && "text-red-600 dark:text-red-400",
                      executionStatus === "running" && "text-blue-600 dark:text-blue-400",
                      executionStatus === "pending" && "text-gray-600 dark:text-gray-400"
                    )}>
                      {executionStatus}
                    </span>
                    {executionDuration && executionStatus === "completed" && (
                      <span className="text-sm text-muted-foreground">
                        • {formatDuration(executionDuration)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Execution Error */}
              {executionError && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-red-600 uppercase tracking-wider">
                    Execution Error
                  </label>
                  <div className="text-sm bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-2 text-red-800 dark:text-red-200">
                    {executionError}
                  </div>
                </div>
              )}

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
