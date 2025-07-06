"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReactFlowWorkflowCanvas } from "@/components/workflow/canvas/reactflow-workflow-canvas"
import { WorkflowRunner } from "@/components/workflow/runner/workflow-runner"
import { WorkflowHeader } from "@/components/workflow/workflow-header"
import { useAgent } from "@/hooks/use-agent"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, Agent, WorkflowExecution, WorkflowNode } from "@dojo/db/convex/types"
import { useState, useCallback, memo } from "react"

interface WorkflowContentAreaProps {
  workflow: Workflow
  workflowNodes: WorkflowNode[]
  workflowExecutions: WorkflowExecution[]
  onEditWorkflow: (workflow: Workflow) => void
  onRunWorkflow: (workflow: Workflow) => void
  onStopWorkflow: (workflowId: Id<"workflows">) => void
  onRemoveNode: (nodeId: string) => void
  onChangeNodeAgent: (nodeId: string, agent: Agent) => void
  onAddStepWithAgent: (parentNodeId: string, agent: Agent) => void
  onAddFirstStep: (agent: Agent) => void
  getModel: (modelId: string) => { name: string } | undefined
}

export const WorkflowContentArea = memo(function WorkflowContentArea({
  workflow,
  workflowNodes,
  workflowExecutions,
  onEditWorkflow,
  onRunWorkflow,
  onStopWorkflow,
  onRemoveNode,
  onChangeNodeAgent,
  onAddStepWithAgent,
  onAddFirstStep,
  getModel,
}: WorkflowContentAreaProps) {
  // Get agents from hook
  const { agents } = useAgent()

  const [activeTab, setActiveTab] = useState<"build" | "run">("build")

  // Get current execution for this workflow (matches WorkflowListItem logic)
  const execution =
    workflowExecutions
      .filter((exec) => exec.workflowId === workflow._id)
      .sort((a, b) => b.startedAt - a.startedAt)[0] || undefined

  const handleRunWorkflow = useCallback(async () => {
    await onRunWorkflow(workflow)
  }, [workflow, onRunWorkflow])

  const handleStopWorkflow = useCallback(() => {
    onStopWorkflow(workflow._id)
  }, [workflow, onStopWorkflow])

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "build" | "run")}
      className="h-full flex flex-col gap-0"
    >
      <WorkflowHeader
        workflow={workflow}
        execution={execution}
        onEditClick={() => onEditWorkflow(workflow)}
        onRunClick={handleRunWorkflow}
        onStopClick={handleStopWorkflow}
        tabsContent={
          <TabsList className="h-8 w-40 border">
            <TabsTrigger value="build" className="text-xs">
              Build
            </TabsTrigger>
            <TabsTrigger value="run" className="text-xs">
              Logs
            </TabsTrigger>
          </TabsList>
        }
      />
      {/* Tab Content */}
      <TabsContent value="build" className="flex-1 overflow-hidden gap-0">
        <ReactFlowWorkflowCanvas
          workflow={workflow}
          agents={agents || []}
          workflowNodes={workflowNodes}
          workflowExecutions={workflowExecutions}
          getModel={getModel}
          isVisible={activeTab === "build"}
          onAddFirstStep={onAddFirstStep}
          onEditMetadata={() => onEditWorkflow(workflow)}
          onRemoveNode={onRemoveNode}
          onChangeNodeAgent={onChangeNodeAgent}
          onAddStepWithAgent={onAddStepWithAgent}
        />
      </TabsContent>
      <TabsContent value="run" className="flex-1 mt-0 overflow-hidden">
        <WorkflowRunner
          workflow={workflow}
          agents={agents || []}
          workflowExecutions={workflowExecutions}
          workflowNodes={workflowNodes}
          onRunWorkflow={onRunWorkflow}
          onStopWorkflow={handleStopWorkflow}
        />
      </TabsContent>
    </Tabs>
  )
})
