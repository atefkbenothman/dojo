"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/hooks/use-auth"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useWorkflow } from "@/hooks/use-workflow"
import { cn } from "@/lib/utils"
import type { Workflow, WorkflowExecution } from "@dojo/db/convex/types"
import { Settings, Play, Pencil, Trash, Copy, Square, CheckCircle, XCircle, Clock } from "lucide-react"
import { useState, useCallback, memo } from "react"

interface WorkflowListItemProps {
  workflow: Workflow
  onEditClick: (workflow: Workflow) => void
  onDeleteClick: (workflow: Workflow) => void
  onCloneClick: (workflow: Workflow) => void
  isSelected: boolean
  onRun: () => void
  onStop: () => void
  execution?: WorkflowExecution
  nodeCount?: number
}

// Helper function to calculate execution progress
const calculateProgress = (execution: WorkflowExecution): number => {
  if (!execution.nodeExecutions || execution.nodeExecutions.length === 0) return 0
  const completed = execution.nodeExecutions.filter((ne) => ne.status === "completed" || ne.status === "failed").length
  return Math.round((completed / execution.totalSteps) * 100)
}

// Helper function to format duration
const formatDuration = (startedAt: number, completedAt?: number) => {
  const end = completedAt || Date.now()
  const duration = Math.round((end - startedAt) / 1000)

  if (duration < 60) return `${duration}s`
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}m ${seconds}s`
}

export const WorkflowListItem = memo(function WorkflowListItem({
  workflow,
  onEditClick,
  onDeleteClick,
  onCloneClick,
  isSelected,
  onRun,
  onStop,
  execution,
  nodeCount,
}: WorkflowListItemProps) {
  const { play } = useSoundEffectContext()
  const { canRun, isWorkflowRunning } = useWorkflow()
  const { isAuthenticated } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Determine if user can edit/delete this workflow (backend handles filtering)
  const canEdit = !workflow.isPublic
  const canDelete = !workflow.isPublic
  const canClone = isAuthenticated

  // Use centralized logic from hook
  const workflowCanRun = canRun(workflow)
  const isRunning = isWorkflowRunning(execution)
  const isPreparing = execution?.status === "preparing"

  // Final run button state: disabled when canRun is false AND not currently running
  // (if running, button becomes a stop button and should remain enabled)
  const shouldDisableRunButton = !workflowCanRun && !isRunning

  // Get ring color based on workflow status
  const getRingColor = () => {
    if (!execution || execution.status === "cancelled") return ""

    switch (execution.status) {
      case "running":
        return "ring-green-500/80"
      case "preparing":
        return "ring-yellow-500/80"
      case "completed":
        return "ring-green-500/80"
      case "failed":
        return "ring-red-500/80"
      default:
        return ""
    }
  }

  // Get status icon
  const getStatusIcon = () => {
    if (!execution || execution.status === "cancelled") return null
    switch (execution.status) {
      case "preparing":
        return <Clock className="h-3 w-3 text-yellow-500" />
      case "running":
        return <LoadingAnimationInline className="h-3 w-3 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const handleCardClick = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  const handlePlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      play("./sounds/click.mp3", { volume: 0.5 })
      if (isRunning) {
        onStop()
      } else {
        onRun()
      }
    },
    [play, isRunning, onRun, onStop],
  )

  const handleMenuAction = useCallback((e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    setDropdownOpen(false)
    action()
  }, [])

  const progress = execution ? calculateProgress(execution) : 0

  return (
    <Card
      className={cn(
        "w-full bg-background overflow-hidden p-2 hover:bg-background/50",
        // Show status ring when there's a status
        getRingColor() && `ring-1 ${getRingColor()}`,
        // Show primary ring when selected (original behavior)
        isSelected && "ring-1 ring-primary/80 bg-background/50",
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Header matching MCP/agent card exactly */}
        <div className="p-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
          {/* Title with status */}
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <p className={cn("text-sm font-medium truncate text-primary/70", isSelected && "text-primary")}>
              {workflow.name}
            </p>
            {getStatusIcon()}
          </div>
          {/* Right Side */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-start sm:justify-end">
            {/* Settings */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8 hover:cursor-pointer">
                  <Settings className="h-2.5 w-2.5 text-foreground/90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={canEdit ? (e) => handleMenuAction(e, () => onEditClick(workflow)) : undefined}
                  className={cn("hover:cursor-pointer", !canEdit && "opacity-50 cursor-not-allowed")}
                  disabled={!canEdit}
                  title={!canEdit ? "Cannot edit public workflows" : undefined}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={canClone ? (e) => handleMenuAction(e, () => onCloneClick(workflow)) : undefined}
                  className={cn("hover:cursor-pointer", !canClone && "opacity-50 cursor-not-allowed")}
                  disabled={!canClone}
                  title={!canClone ? "Sign in to clone workflows" : undefined}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Clone
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(
                    "text-destructive focus:text-destructive hover:cursor-pointer",
                    !canDelete && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={canDelete ? (e) => handleMenuAction(e, () => onDeleteClick(workflow)) : undefined}
                  disabled={!canDelete}
                  title={!canDelete ? "Cannot delete public workflows" : undefined}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Run/Stop button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayClick}
              disabled={shouldDisableRunButton}
              className="size-8 hover:cursor-pointer"
              title={isRunning ? "Stop workflow" : "Run workflow"}
            >
              {isPreparing ? (
                <LoadingAnimationInline className="text-xs" />
              ) : isRunning ? (
                <Square className="h-2.5 w-2.5" />
              ) : (
                <Play className="h-2.5 w-2.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Progress bar for running workflows */}
        {isRunning && execution && (
          <div className="px-3 pb-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress}% complete</span>
              <span>{formatDuration(execution.startedAt)}</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}

        {/* Badge Row */}
        <div className="px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            {nodeCount !== undefined && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border">
                {nodeCount} {nodeCount === 1 ? "STEP" : "STEPS"}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
