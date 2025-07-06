"use client"

import { Button } from "@/components/ui/button"
import { useWorkflow } from "@/hooks/use-workflow"
import { Workflow, WorkflowExecution } from "@dojo/db/convex/types"
import { Play, Pencil, Square } from "lucide-react"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { memo, ReactNode } from "react"

interface WorkflowHeaderProps {
  workflow: Workflow
  execution?: WorkflowExecution
  onEditClick: () => void
  onRunClick: () => void
  onStopClick: () => void
  tabsContent: ReactNode
}

export const WorkflowHeader = memo(function WorkflowHeader({
  workflow,
  execution,
  onEditClick,
  onRunClick,
  onStopClick,
  tabsContent,
}: WorkflowHeaderProps) {
  const { canRun, isWorkflowRunning } = useWorkflow()

  // Use centralized logic from hook (IDENTICAL to WorkflowListItem)
  const workflowCanRun = canRun(workflow, execution)
  const isRunning = isWorkflowRunning(execution)
  const isPreparing = execution?.status === "preparing"
  
  // Final run button state: disabled when canRun is false AND not currently running
  // (if running, button becomes a stop button and should remain enabled)
  const shouldDisableRunButton = !workflowCanRun && !isRunning
  
  const handleButtonClick = () => {
    if (isRunning) {
      onStopClick()
    } else {
      onRunClick()
    }
  }
  return (
    <div className="border-b-[1.5px] flex-shrink-0 bg-card h-[42px] overflow-x-auto">
      <div className="px-4 grid grid-cols-3 items-center h-full min-w-fit">
        {/* Left section - Name and Edit */}
        <div className="flex items-center gap-2 justify-start">
          <p className="text-sm font-semibold whitespace-nowrap truncate">{workflow.name}</p>
          {/* Edit */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditClick}
            className="hover:cursor-pointer flex-shrink-0 h-8 w-8"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>

        {/* Center section - Tabs */}
        <div className="flex items-center justify-center">
          {tabsContent}
        </div>

        {/* Right section - Run/Stop button */}
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            className="bg-green-700 hover:bg-green-800 text-white border-green-500 border-[1px] hover:border-green-800 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-700 h-8"
            onClick={handleButtonClick}
            disabled={shouldDisableRunButton}
            title={isRunning ? "Stop workflow" : "Run workflow"}
          >
            {isPreparing ? (
              <>
                <LoadingAnimationInline className="h-3 w-3 mr-1" />
                Preparing
              </>
            ) : isRunning ? (
              <>
                <Square className="h-3 w-3 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Run
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
})
