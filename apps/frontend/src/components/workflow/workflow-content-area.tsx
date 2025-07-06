"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReactFlowWorkflowCanvas } from "@/components/workflow/canvas/reactflow-workflow-canvas"
import { WorkflowRunner } from "@/components/workflow/runner/workflow-runner"
import { WorkflowHeader } from "@/components/workflow/workflow-header"
import { useAgent } from "@/hooks/use-agent"
import { useAuth } from "@/hooks/use-auth"
import { useWorkflow } from "@/hooks/use-workflow"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, Agent } from "@dojo/db/convex/types"
import { useState, useCallback, memo } from "react"

interface WorkflowContentAreaProps {
  selectedWorkflowId: string | null
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
  selectedWorkflowId,
  onEditWorkflow,
  onRunWorkflow,
  onStopWorkflow,
  onRemoveNode,
  onChangeNodeAgent,
  onAddStepWithAgent,
  onAddFirstStep,
  getModel,
}: WorkflowContentAreaProps) {
  // Get data from hooks
  const { selectedWorkflow: workflow, workflowNodes, executions: workflowExecutions } = useWorkflow()
  const { agents } = useAgent()
  const { isAuthenticated } = useAuth()

  const [activeTab, setActiveTab] = useState<"build" | "run">("build")

  const handleRunWorkflow = useCallback(async () => {
    if (!workflow) return
    await onRunWorkflow(workflow)
  }, [workflow, onRunWorkflow])

  const handleStopWorkflow = useCallback(() => {
    if (!workflow) return
    onStopWorkflow(workflow._id)
  }, [workflow, onStopWorkflow])

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          {selectedWorkflowId ? "Workflow does not exist" : "Select a workflow"}
        </p>
      </div>
    )
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "build" | "run")}
      className="h-full flex flex-col gap-0"
    >
      <WorkflowHeader
        workflow={workflow}
        onEditClick={() => onEditWorkflow(workflow)}
        onRunClick={handleRunWorkflow}
        canRun={!!workflow.instructions && workflow.instructions.trim() !== "" && !!workflow.rootNodeId}
        tabsContent={
          <TabsList className="h-8 w-40">
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
          isAuthenticated={isAuthenticated}
          workflowExecutions={workflowExecutions}
          workflowNodes={workflowNodes}
          onRunWorkflow={onRunWorkflow}
          onStopWorkflow={handleStopWorkflow}
        />
      </TabsContent>
    </Tabs>
  )
})
