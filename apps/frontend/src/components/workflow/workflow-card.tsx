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
import { Workflow, Agent, WorkflowExecution } from "@dojo/db/convex/types"
import { Play, Pencil, Trash, CheckCircle, XCircle, Clock, Loader2, Square, Settings, Copy } from "lucide-react"
import { useCallback, memo, useState } from "react"

// Helper functions
const getStatusIcon = (execution?: WorkflowExecution) => {
  if (!execution) return <Play className="h-3 w-3" />
  switch (execution.status) {
    case "preparing":
      return <Clock className="h-3 w-3 text-yellow-500" />
    case "running":
      return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
    case "completed":
      return <CheckCircle className="h-3 w-3 text-green-500" />
    case "failed":
      return <XCircle className="h-3 w-3 text-red-500" />
    case "cancelled":
      return <XCircle className="h-3 w-3 text-gray-500" />
    default:
      return <Play className="h-3 w-3" />
  }
}

const formatDuration = (startedAt: number, completedAt?: number) => {
  const end = completedAt || Date.now()
  const duration = Math.round((end - startedAt) / 1000)

  if (duration < 60) return `${duration}s`
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}m ${seconds}s`
}

interface WorkflowCardHeaderProps {
  workflow: Workflow
  isSelected: boolean
  isAuthenticated: boolean
  onRun?: (workflow: Workflow) => void
  onStop?: (workflow: Workflow) => void
  onEdit?: (workflow: Workflow) => void
  onDelete?: (workflow: Workflow) => void
  onClone?: (workflow: Workflow) => void
  execution?: WorkflowExecution
  nodeCount?: number
}

const WorkflowCardHeader = memo(function WorkflowCardHeader({
  workflow,
  isSelected,
  isAuthenticated,
  onRun,
  onStop,
  onEdit,
  onDelete,
  onClone,
  execution,
  nodeCount,
}: WorkflowCardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const isRunning = execution?.status === "preparing" || execution?.status === "running"

  // Determine if user can edit/delete this workflow
  const canEdit = isAuthenticated && !workflow.isPublic
  const canDelete = isAuthenticated && !workflow.isPublic

  const handleRunOrStop = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isRunning && onStop) {
        onStop(workflow)
      } else if (!isRunning && onRun) {
        onRun(workflow)
      }
    },
    [isRunning, onRun, onStop, workflow],
  )

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setDropdownOpen(false)
      if (onEdit) {
        onEdit(workflow)
      }
    },
    [onEdit, workflow],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setDropdownOpen(false)
      if (onDelete) {
        onDelete(workflow)
      }
    },
    [onDelete, workflow],
  )

  const handleClone = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setDropdownOpen(false)
      if (onClone) {
        onClone(workflow)
      }
    },
    [onClone, workflow],
  )

  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
      {/* Title */}
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <p className={cn("text-sm font-medium truncate text-primary/70", isSelected && "text-primary")}>
          {workflow.name}
        </p>
        {execution && getStatusIcon(execution)}
      </div>
      {/* Right Side */}
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-start sm:justify-end">
        {/* Number of nodes */}
        <div className="flex items-center justify-center size-8 border text-[10px] font-medium shrink-0">
          {nodeCount ?? '-'}
        </div>
        {/* Settings */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-8 hover:cursor-pointer">
              <Settings className="h-2.5 w-2.5 text-foreground/90" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={handleEdit} className="cursor-pointer" disabled={!canEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleClone} className="cursor-pointer" disabled={!isAuthenticated}>
              <Copy className="mr-2 h-4 w-4" />
              Clone
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="cursor-pointer text-destructive focus:text-destructive"
              disabled={!canDelete}
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
          onClick={handleRunOrStop}
          disabled={!isAuthenticated || !workflow.rootNodeId}
          className="size-8 hover:cursor-pointer"
        >
          {isRunning ? <Square className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
        </Button>
      </div>
    </div>
  )
})

interface WorkflowExecutionStatusProps {
  execution: WorkflowExecution
  agents: Agent[]
  isAuthenticated: boolean
  onRun?: (workflow: Workflow) => void
}

// WorkflowExecutionStatus component
const WorkflowExecutionStatus = memo(function WorkflowExecutionStatus({
  execution,
  agents,
}: WorkflowExecutionStatusProps) {
  const isActiveExecution = execution.status === "preparing" || execution.status === "running"

  const getProgressPercentage = () => {
    // If we have node executions, count based on those
    if ("nodeExecutions" in execution && execution.nodeExecutions && execution.nodeExecutions.length > 0) {
      const completedNodes = execution.nodeExecutions.filter((ne) => ne.status === "completed").length
      return Math.round((completedNodes / execution.totalSteps) * 100)
    }

    // For legacy executions or when no nodes yet
    if ("currentNodes" in execution && execution.currentNodes && execution.currentNodes.length > 0) {
      // If workflow is running with current nodes, show progress
      return execution.status === "running" ? Math.round((execution.currentNodes.length / execution.totalSteps) * 100) : 0
    }

    // Fallback for preparing/initial state
    return execution.status === "running" ? Math.round((1 / execution.totalSteps) * 100) : 0
  }

  const getCurrentNodeName = () => {
    if (!("currentNodes" in execution) || !execution.currentNodes || execution.currentNodes.length === 0) {
      return null
    }

    // For simplicity, show the first current node name
    const currentNodeId = execution.currentNodes[0]
    if (!("nodeExecutions" in execution) || !execution.nodeExecutions) {
      return `Node ${currentNodeId}`
    }

    const currentNodeExecution = execution.nodeExecutions.find(ne => ne.nodeId === currentNodeId)
    if (!currentNodeExecution?.agentId) {
      return `Node ${currentNodeId}`
    }

    // Find the agent and return its name
    const currentAgent = agents.find((agent) => agent._id === currentNodeExecution.agentId)
    return currentAgent ? currentAgent.name : `Node ${currentNodeId}`
  }

  const getProgressText = () => {
    switch (execution.status) {
      case "preparing":
        return "Preparing workflow..."
      case "running": {
        const nodeName = getCurrentNodeName()
        const currentNodeCount = ("currentNodes" in execution && execution.currentNodes) ? execution.currentNodes.length : 1
        
        if (nodeName && currentNodeCount === 1) {
          return `Running: ${nodeName}`
        } else if (currentNodeCount > 1) {
          return `Running ${currentNodeCount} nodes`
        } else {
          return "Running workflow..."
        }
      }
      case "completed":
        return `Completed in ${formatDuration(execution.startedAt, execution.completedAt)}`
      case "failed":
        return execution.error?.toLowerCase().includes("cancel")
          ? "Workflow cancelled"
          : execution.error
            ? "Failed"
            : "Execution failed"
      case "cancelled":
        return "Workflow cancelled"
      default:
        return null
    }
  }

  return (
    <>
      {/* Extension content */}
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1 min-w-0">
          <span
            className={cn(
              "text-[11px] truncate font-medium",
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
        {isActiveExecution && (
          <Progress value={getProgressPercentage()} className="h-1 w-full" />
        )}
      </div>
    </>
  )
})

interface WorkflowCardProps {
  workflow: Workflow
  isAuthenticated?: boolean
  onEditClick?: (workflow: Workflow) => void
  onDeleteClick?: (workflow: Workflow) => void
  onCloneClick?: (workflow: Workflow) => void
  isSelected?: boolean
  onRun?: (workflow: Workflow) => void
  onStop?: (workflow: Workflow) => void
  execution?: WorkflowExecution
  agents?: Agent[]
  nodeCount?: number
}

export const WorkflowCard = memo(function WorkflowCard({
  workflow,
  isAuthenticated = false,
  onEditClick,
  onDeleteClick,
  onCloneClick,
  isSelected = false,
  onRun,
  onStop,
  execution,
  agents = [],
  nodeCount,
}: WorkflowCardProps) {
  const { play } = useSoundEffectContext()

  const handleMouseDown = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  // Determine if execution is active
  const isActiveExecution = execution?.status === "preparing" || execution?.status === "running"

  return (
    <Card
      className={cn(
        "w-full bg-background overflow-hidden p-2 hover:bg-background/50",
        // Running state takes highest priority
        execution && isActiveExecution && "border-blue-500 dark:border-blue-500",
        // Selected state only applies if not running
        isSelected && !isActiveExecution && "ring-1 ring-primary/80 bg-background/50",
      )}
      onMouseDown={handleMouseDown}
    >
      <CardContent className="p-0">
        <WorkflowCardHeader
          isSelected={isSelected}
          workflow={workflow}
          isAuthenticated={isAuthenticated}
          onRun={onRun}
          onStop={onStop}
          onEdit={onEditClick}
          onDelete={onDeleteClick}
          onClone={onCloneClick}
          execution={execution}
          nodeCount={nodeCount}
        />
        {execution && (
          <WorkflowExecutionStatus
            execution={execution}
            agents={agents}
            isAuthenticated={isAuthenticated}
            onRun={onRun}
          />
        )}
      </CardContent>
    </Card>
  )
})
