"use client"

import { WorkflowExecutionView } from "@/components/workflow/runner/workflow-execution-view"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, Agent, WorkflowExecution, WorkflowNode } from "@dojo/db/convex/types"
import { memo } from "react"

interface WorkflowRunnerProps {
  workflow: Workflow
  agents: Agent[]
  isAuthenticated: boolean
  workflowExecutions: WorkflowExecution[]
  workflowNodes: WorkflowNode[]
  onRunWorkflow: (workflow: Workflow) => void
  onStopWorkflow: (workflowId: Id<"workflows">) => void
}

export const WorkflowRunner = memo(function WorkflowRunner({
  workflow,
  agents,
  workflowExecutions,
  workflowNodes,
}: WorkflowRunnerProps) {
  const execution = workflowExecutions
    .filter(exec => exec.workflowId === workflow._id)
    .sort((a, b) => b.startedAt - a.startedAt)[0] || undefined

  return (
    <div className="h-full bg-background">
      <WorkflowExecutionView workflow={workflow} execution={execution} agents={agents} workflowNodes={workflowNodes} />
    </div>
  )
})
