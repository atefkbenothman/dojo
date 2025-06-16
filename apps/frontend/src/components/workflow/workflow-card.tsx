"use client"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { StepsPopover } from "@/components/workflow/steps-popover"
import { WorkflowDialog } from "@/components/workflow/workflow-dialog"
import { useWorkflow } from "@/hooks/use-workflow"
import { cn } from "@/lib/utils"
import { Workflow } from "@dojo/db/convex/types"
import { Settings } from "lucide-react"
import { useState, useCallback } from "react"

interface WorkflowCardProps {
  workflow: Workflow
  isAuthenticated?: boolean
}

export function WorkflowCard({ workflow, isAuthenticated = false }: WorkflowCardProps) {
  const { runWorkflow, getWorkflowExecution } = useWorkflow()

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)

  // Get execution data directly from Convex
  const execution = getWorkflowExecution(workflow._id)

  // Derive state from execution
  const status =
    execution?.status === "completed" ? "idle" : execution?.status === "failed" ? "error" : execution?.status || "idle"
  const error = execution?.error || null
  const currentStep = execution?.currentStep
  const totalSteps = execution?.totalSteps || workflow.steps.length
  const isRunning = status === "preparing" || status === "running"

  // For progress text, we'll show step info when running
  const showStepProgress = status === "running" && currentStep !== null && currentStep !== undefined

  const handleRun = useCallback(() => {
    runWorkflow(workflow)
  }, [runWorkflow, workflow])

  return (
    <>
      <Card
        className={cn(
          "relative h-[10rem] max-h-[10rem] w-full max-w-[16rem] border flex flex-col overflow-hidden transition-all duration-200",
          isRunning && "border-primary/80 bg-muted/50 border-2",
          status === "error" && "border-destructive/80 bg-destructive/5 border-2",
        )}
      >
        <div className="absolute top-2 right-2 z-10 bg-secondary/80 border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {workflow.steps.length} steps
        </div>
        <CardHeader className=" flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-primary/90 font-medium">{workflow.name}</CardTitle>
            {status === "preparing" && <div className="ml-2 h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />}
            {status === "running" && <div className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
            {status === "error" && <div className="ml-2 h-2 w-2 rounded-full bg-red-500" />}
          </div>
          <CardDescription className="w-[90%] line-clamp-2 overflow-hidden">{workflow.description}</CardDescription>
          {showStepProgress && (
            <p className="text-xs text-muted-foreground mt-1">
              Step {currentStep + 1} of {totalSteps}
            </p>
          )}
          {error && status === "error" && <p className="text-xs text-destructive mt-1 line-clamp-1">{error}</p>}
        </CardHeader>
        <CardFooter className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={isRunning ? "default" : "secondary"}
              onClick={handleRun}
              disabled={!isAuthenticated || isRunning}
              className={cn(
                "border hover:cursor-pointer",
                isRunning ? "bg-primary hover:bg-primary" : "bg-secondary/80 hover:bg-secondary/90",
              )}
            >
              {status === "preparing" ? "Preparing..." : status === "running" ? "Running..." : "Run"}
            </Button>

            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsConfigDialogOpen(true)}
              className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
            >
              <Settings className="h-4 w-4" />
            </Button>

            <StepsPopover workflow={workflow} />
          </div>
        </CardFooter>
      </Card>
      <WorkflowDialog
        mode="edit"
        workflow={workflow}
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        isAuthenticated={isAuthenticated}
      />
    </>
  )
}
