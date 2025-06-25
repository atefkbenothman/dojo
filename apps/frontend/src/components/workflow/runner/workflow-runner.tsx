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
      <WorkflowExecutionView
        workflow={workflow}
        execution={execution as WorkflowExecution | undefined}
        agents={agents}
        workflowSteps={workflow.steps}
      />
    </div>
  )
})
