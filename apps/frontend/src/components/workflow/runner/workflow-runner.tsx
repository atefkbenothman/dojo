"use client"

import { Button } from "@/components/ui/button"
import { WorkflowExecutionView } from "@/components/workflow/runner/workflow-execution-view"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, Agent, WorkflowExecution } from "@dojo/db/convex/types"
import { memo } from "react"

interface WorkflowRunnerProps {
  workflow: Workflow
  agents: Agent[]
  isAuthenticated: boolean
  workflowExecutions: Map<Id<"workflows">, any>
  onRunWorkflow: (workflow: Workflow) => void
  onStopWorkflow: (workflowId: string) => void
}

export const WorkflowRunner = memo(function WorkflowRunner({
  workflow,
  agents,
  isAuthenticated,
  workflowExecutions,
  onRunWorkflow,
  onStopWorkflow,
}: WorkflowRunnerProps) {
  // Get execution data for this workflow
  const execution = workflowExecutions.get(workflow._id)

  return (
    <div className="h-full bg-background">
      {execution ? (
        <WorkflowExecutionView
          workflow={workflow}
          execution={execution as WorkflowExecution}
          agents={agents}
          workflowSteps={workflow.steps}
          onStop={() => onStopWorkflow(workflow._id)}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3 max-w-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{workflow.name}</h3>
              {workflow.description && <p className="text-xs text-muted-foreground">{workflow.description}</p>}
            </div>
            <p className="text-xs text-muted-foreground">No active execution. Run the workflow to see progress here.</p>
            <Button
              onClick={() => onRunWorkflow(workflow)}
              disabled={!isAuthenticated || workflow.steps.length === 0}
              size="default"
            >
              Run Workflow
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})
