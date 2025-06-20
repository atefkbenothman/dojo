"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { Workflow, Agent } from "@dojo/db/convex/types"
import { Play, MoreVertical, Pencil, Trash, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"
import { useCallback, memo, useState } from "react"

interface WorkflowExecution {
  _id?: string
  workflowId: string
  status: "preparing" | "running" | "completed" | "failed" | "cancelled"
  currentStep?: number
  totalSteps: number
  stepExecutions?: Array<{
    stepIndex: number
    agentId: string
    status: "pending" | "running" | "completed" | "failed"
    startedAt?: number
    completedAt?: number
    error?: string
  }>
  startedAt: number
  completedAt?: number
  error?: string
  sessionId?: string
}

interface WorkflowCardProps {
  workflow: Workflow
  isAuthenticated?: boolean
  onEditClick?: (workflow: Workflow) => void
  onDeleteClick?: (workflow: Workflow) => void
  isSelected?: boolean
  onRun?: (workflow: Workflow) => void
  execution?: WorkflowExecution
  agents?: Agent[]
}

export const WorkflowCard = memo(function WorkflowCard({
  workflow,
  isAuthenticated = false,
  onEditClick,
  onDeleteClick,
  isSelected = false,
  onRun,
  execution,
  agents = [],
}: WorkflowCardProps) {
  const { play } = useSoundEffectContext()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Helper functions for execution status
  const isRunning = execution?.status === "preparing" || execution?.status === "running"
  const showExpandedView = !!execution // Expand for any workflow with execution data
  const isActiveExecution = isRunning // Track active vs completed states separately

  const getProgressPercentage = () => {
    if (!execution || !execution.currentStep) return 0
    return Math.round((execution.currentStep / execution.totalSteps) * 100)
  }

  const getProgressText = () => {
    if (!execution) return null

    switch (execution.status) {
      case "preparing":
        return "Preparing workflow..."
      case "running":
        const current = (execution.currentStep ?? 0) + 1
        const stepName = getCurrentStepName()
        return stepName
          ? `Running: ${stepName} (${current}/${execution.totalSteps})`
          : `Running step ${current} of ${execution.totalSteps}`
      case "completed":
        return `Completed in ${formatDuration(execution.startedAt, execution.completedAt)}`
      case "failed":
        return execution.error
          ? `Failed: ${execution.error.length > 50 ? execution.error.slice(0, 50) + "..." : execution.error}`
          : "Execution failed"
      case "cancelled":
        return "Cancelled"
      default:
        return null
    }
  }

  const getCurrentStepName = () => {
    if (!execution || execution.currentStep === undefined) return null

    // Get the agent ID for the current step
    const currentStepAgentId = workflow.steps[execution.currentStep]
    if (!currentStepAgentId) return null

    // Find the agent and return its name
    const currentAgent = agents.find((agent) => agent._id === currentStepAgentId)
    return currentAgent ? currentAgent.name : `Step ${execution.currentStep + 1}`
  }

  const formatDuration = (startedAt: number, completedAt?: number) => {
    const end = completedAt || Date.now()
    const duration = Math.round((end - startedAt) / 1000)

    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }

  const getStatusIcon = () => {
    if (!execution) return <Play className="h-3.5 w-3.5" />

    switch (execution.status) {
      case "preparing":
        return <Clock className="h-3.5 w-3.5 animate-pulse text-yellow-500" />
      case "running":
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      case "failed":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />
      case "cancelled":
        return <XCircle className="h-3.5 w-3.5 text-gray-500" />
      default:
        return <Play className="h-3.5 w-3.5" />
    }
  }

  const handleRun = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onRun) {
        onRun(workflow)
      }
    },
    [onRun, workflow],
  )

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setDropdownOpen(false)
      if (onEditClick) {
        onEditClick(workflow)
      }
    },
    [onEditClick, workflow],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setDropdownOpen(false)
      if (onDeleteClick) {
        onDeleteClick(workflow)
      }
    },
    [onDeleteClick, workflow],
  )

  const handleMouseDown = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  return (
    <Card
      className={cn(
        "w-full hover:bg-background/50 bg-background transition-colors",
        isSelected && "border-primary border-2 bg-background/50",
        // Execution state styling for card borders
        execution &&
          !isActiveExecution &&
          execution.status === "completed" &&
          "border-green-200 dark:border-green-800/50",
        execution && !isActiveExecution && execution.status === "failed" && "border-red-200 dark:border-red-800/50",
      )}
      onMouseDown={handleMouseDown}
    >
      <CardContent className="p-0">
        <div
          className={cn(
            "flex px-4 gap-3",
            isActiveExecution
              ? "items-start py-3" // Active: full padding
              : showExpandedView
                ? "items-start py-2.5" // Completed: medium padding
                : "items-center py-1.5 min-h-[2.75rem]", // Default: compact
          )}
        >
          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Top row: Name and step count */}
            <div className={cn("flex items-center gap-2", showExpandedView ? "mb-1" : "mb-0")}>
              <p className="text-sm font-medium truncate flex-1">{workflow.name}</p>

              {/* Subtle status indicator for completed/failed workflows (compact view only) */}
              {!showExpandedView && execution && ((execution as WorkflowExecution).status === "completed" || (execution as WorkflowExecution).status === "failed") && (
                <div
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    (execution as WorkflowExecution).status === "completed" ? "bg-green-500" : "bg-red-500",
                  )}
                />
              )}

              <div className="flex items-center justify-center h-5 w-5 border text-xs font-medium shrink-0">
                {workflow.steps.length}
              </div>
            </div>

            {/* Execution status row - show for all expanded workflows */}
            {showExpandedView && execution && (
              <div
                className={cn(
                  "space-y-2 mt-1",
                  // Different styling themes for each state
                  isActiveExecution
                    ? "" // Active: full opacity and normal spacing
                    : execution.status === "completed"
                      ? "opacity-90" // Completed: slightly muted
                      : execution.status === "failed"
                        ? "opacity-95" // Failed: almost full opacity for visibility
                        : "opacity-80", // Other states: muted
                )}
              >
                <div className="flex items-center gap-1 min-w-0">
                  {getStatusIcon()}
                  <span
                    className={cn(
                      "text-xs truncate font-medium",
                      // Status-specific text styling
                      isActiveExecution
                        ? "text-muted-foreground" // Active: normal muted text
                        : execution.status === "completed"
                          ? "text-green-700 dark:text-green-400" // Completed: green text
                          : execution.status === "failed"
                            ? "text-red-700 dark:text-red-400" // Failed: red text
                            : execution.status === "cancelled"
                              ? "text-gray-600 dark:text-gray-400" // Cancelled: gray text
                              : "text-muted-foreground", // Default
                    )}
                  >
                    {getProgressText()}
                  </span>
                </div>

                {/* Progress bar only for active workflows */}
                {isActiveExecution && execution.currentStep !== undefined && (
                  <Progress value={getProgressPercentage()} className="h-1 w-full" />
                )}

                {/* Additional actions for failed executions */}
                {execution.status === "failed" && (
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onRun) onRun(workflow)
                      }}
                      disabled={!isAuthenticated}
                      className="h-6 px-2 text-xs"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className={cn("flex gap-1 shrink-0", showExpandedView ? "items-start pt-0.5" : "items-center")}>
            {/* Run button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRun}
              disabled={!isAuthenticated || isRunning}
              className="h-8 w-8"
            >
              {execution ? getStatusIcon() : <Play className="h-3.5 w-3.5" />}
            </Button>

            {/* Dropdown menu for edit/delete */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!isAuthenticated || workflow.isPublic}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
