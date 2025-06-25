"use client"

import { WorkflowExecutionView } from "@/components/workflow/runner/workflow-execution-view"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, Agent, WorkflowExecution } from "@dojo/db/convex/types"
import { memo } from "react"

interface WorkflowRunnerProps {
  workflow: Workflow
  agents: Agent[]
  isAuthenticated: boolean
  workflowExecutions: Map<Id<"workflows">, WorkflowExecution>
  onRunWorkflow: (workflow: Workflow) => void
  onStopWorkflow: (workflowId: string) => void
}

export const WorkflowRunner = memo(function WorkflowRunner({
  workflow,
  agents,
  workflowExecutions,
}: WorkflowRunnerProps) {
  const execution = workflowExecutions.get(workflow._id)

  return (
    <div className="h-full bg-background">
      <WorkflowExecutionView workflow={workflow} execution={execution} agents={agents} workflowSteps={workflow.steps} />
    </div>
  )
})
