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
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { Progress } from "@/components/ui/progress"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import type { Workflow, WorkflowExecution } from "@dojo/db/convex/types"
import { Settings, Play, Pencil, Trash, Copy, Square, CheckCircle, XCircle, Clock } from "lucide-react"
import { useState, useCallback, memo } from "react"

interface WorkflowListItemProps {
  workflow: Workflow
  isAuthenticated: boolean
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
  const completed = execution.nodeExecutions.filter(
    (ne) => ne.status === "completed" || ne.status === "failed"
  ).length
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
  isAuthenticated,
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
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Determine if user can edit/delete this workflow
  const canEdit = isAuthenticated && !workflow.isPublic
  const canDelete = isAuthenticated && !workflow.isPublic
  const canRun = !!workflow.instructions && workflow.instructions.trim() !== "" && !!workflow.rootNodeId

  // Get workflow status
  const isRunning = execution?.status === "running" || execution?.status === "preparing"
  const isPreparing = execution?.status === "preparing"
  const isCompleted = execution?.status === "completed"
  const isFailed = execution?.status === "failed"
  const isCancelled = execution?.status === "cancelled"

  // Get ring color based on workflow status
  const getRingColor = () => {
    if (!execution) return ""
    
    switch (execution.status) {
      case "running":
        return "ring-green-500/80"
      case "preparing":
        return "ring-yellow-500/80"
      case "completed":
        return "ring-green-500/80"
      case "failed":
        return "ring-red-500/80"
      case "cancelled":
        return "ring-gray-500/80"
      default:
        return ""
    }
  }

  // Get status icon
  const getStatusIcon = () => {
    if (!execution) return null
    switch (execution.status) {
      case "preparing":
        return <Clock className="h-3 w-3 text-yellow-500" />
      case "running":
        return <LoadingAnimationInline className="h-3 w-3 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />
      case "cancelled":
        return <XCircle className="h-3 w-3 text-gray-500" />
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
    [play, isRunning, onRun, onStop]
  )

  const handleMenuAction = useCallback(
    (e: React.MouseEvent, action: () => void) => {
      e.stopPropagation()
      setDropdownOpen(false)
      action()
    },
    []
  )

  const progress = execution ? calculateProgress(execution) : 0

  return (
    <Card
      className={cn(
        "transition-all duration-150 hover:cursor-pointer",
        isSelected
          ? "bg-accent shadow-sm ring-1 ring-primary/20"
          : "hover:bg-muted/40 hover:shadow-sm",
        getRingColor() && `ring-1 ${getRingColor()}`
      )}
      onMouseDown={handleCardClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium truncate">{workflow.name}</h3>
              {getStatusIcon()}
            </div>
            {workflow.description && (
              <p className="text-xs text-muted-foreground truncate mt-1">{workflow.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Run/Stop button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayClick}
              disabled={!canRun && !isRunning}
              className="h-8 w-8 hover:cursor-pointer"
              title={isRunning ? "Stop workflow" : "Run workflow"}
            >
              {isPreparing ? (
                <LoadingAnimationInline className="h-3 w-3" />
              ) : isRunning ? (
                <Square className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>

            {/* Dropdown menu */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 hover:cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canEdit && (
                  <>
                    <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onEditClick(workflow))}>
                      <Pencil className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onCloneClick(workflow))}>
                  <Copy className="h-3 w-3 mr-2" />
                  Clone
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={(e) => handleMenuAction(e, () => onDeleteClick(workflow))}
                    >
                      <Trash className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress bar for running workflows */}
        {isRunning && execution && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress}% complete</span>
              <span>{formatDuration(execution.startedAt)}</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}

        {/* Node count */}
        {nodeCount !== undefined && (
          <div className="text-xs text-muted-foreground">
            {nodeCount} {nodeCount === 1 ? "step" : "steps"}
          </div>
        )}
      </CardContent>
    </Card>
  )
})