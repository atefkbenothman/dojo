"use client"

import { NodeDeleteDialog } from "@/components/workflow/node-delete-dialog"
import { WorkflowContentArea } from "@/components/workflow/workflow-content-area"
import { WorkflowDeleteDialog } from "@/components/workflow/workflow-delete-dialog"
import { WorkflowGenerateDialog } from "@/components/workflow/workflow-generate-dialog"
import { WorkflowMetadataDialog } from "@/components/workflow/workflow-metadata-dialog"
import { WorkflowSidebar } from "@/components/workflow/workflow-sidebar"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useAuth } from "@/hooks/use-auth"
import { useStableQuery } from "@/hooks/use-stable-query"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { useWorkflow } from "@/hooks/use-workflow"
import { useWorkflowNodes } from "@/hooks/use-workflow-nodes"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow as WorkflowType } from "@dojo/db/convex/types"
import { useState, useCallback, useMemo } from "react"

export function Workflow() {
  const { isAuthenticated } = useAuth()
  const { selectedId: selectedWorkflowId, setSelectedId: setSelectedWorkflowId } = useUrlSelection()

  // Get all workflow data and operations from the hook
  const {
    workflows,
    executions,
    getWorkflowExecution,
    create,
    edit,
    remove,
    runWorkflow,
    stopWorkflow,
    clone,
  } = useWorkflow()
  const { agents } = useAgent()
  const { getModel } = useAIModels()
  
  // Find selected workflow from the list
  const selectedWorkflow = useMemo(() => {
    if (!selectedWorkflowId) return null
    return workflows.find((w) => w._id === selectedWorkflowId) || null
  }, [workflows, selectedWorkflowId])
  
  // Fetch workflow nodes for selected workflow
  const workflowNodes = useStableQuery(
    api.workflows.getWorkflowNodes,
    selectedWorkflow ? { workflowId: selectedWorkflow._id } : "skip"
  ) || []

  // Get node operations
  const {
    nodeToDelete,
    setNodeToDelete,
    handleRemoveNode,
    confirmDeleteNode,
    handleChangeNodeAgent,
    handleAddStepWithAgent,
    handleAddFirstStep,
  } = useWorkflowNodes({
    selectedWorkflow,
    workflowNodes,
    isAuthenticated,
    onEditWorkflow: edit,
  })

  // Dialog state management
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowType | null>(null)
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowType | null>(null)
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)

  // Memoized callbacks
  const handleEditWorkflow = useCallback((workflow: WorkflowType) => {
    setEditingWorkflow(workflow)
    setIsMetadataDialogOpen(true)
  }, [])

  const handleDeleteWorkflow = useCallback((workflow: WorkflowType) => {
    setWorkflowToDelete(workflow)
  }, [])

  const handleCloneWorkflow = useCallback(
    async (workflow: WorkflowType) => {
      await clone(workflow._id)
    },
    [clone],
  )

  const handleGenerateWorkflow = useCallback(() => {
    setIsGenerateDialogOpen(true)
  }, [])

  const getModelWrapper = useCallback(
    (modelId: string) => {
      const model = getModel(modelId as Id<"models">)
      return model ? { name: model.name } : undefined
    },
    [getModel],
  )

  const handleWorkflowDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setWorkflowToDelete(null)
    }
  }, [])

  const handleMetadataDialogChange = useCallback((open: boolean) => {
    setIsMetadataDialogOpen(open)
    if (!open) {
      setEditingWorkflow(null)
    }
  }, [])

  const handleNodeDeleteDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setNodeToDelete(null)
      }
    },
    [setNodeToDelete],
  )

  const getAgentForNode = useCallback(
    (agentId?: string) => {
      if (!agentId || !agents) return undefined
      return agents.find((a) => a._id === agentId)
    },
    [agents],
  )

  const handleConfirmDeleteWorkflow = useCallback(async () => {
    if (workflowToDelete) {
      // Clear the selection BEFORE deletion to prevent queries from running on deleted workflow
      if (selectedWorkflowId === workflowToDelete._id) {
        setSelectedWorkflowId(null)
      }
      await remove({ id: workflowToDelete._id })
      setWorkflowToDelete(null)
    }
  }, [remove, selectedWorkflowId, workflowToDelete, setSelectedWorkflowId])

  const handleCreateWorkflow = useCallback(async () => {
    const newWorkflow = {
      name: "Untitled Workflow",
      description: "",
      instructions: "",
      isPublic: false,
    }

    // Create the workflow and auto-select it
    const workflowId = await create(newWorkflow)
    if (workflowId) {
      setSelectedWorkflowId(workflowId)
    }
  }, [create, setSelectedWorkflowId])

  const handleSelectWorkflow = useCallback(
    (workflow: WorkflowType) => {
      // Toggle selection - if clicking the same workflow, unselect it
      setSelectedWorkflowId(selectedWorkflowId === workflow._id ? null : workflow._id)
      // Note: activeTab state is preserved automatically when switching workflows
    },
    [selectedWorkflowId, setSelectedWorkflowId],
  )

  const handleSaveWorkflowMetadata = useCallback(
    async (updates: { name: string; description: string; instructions: string }) => {
      if (!editingWorkflow) return
      await edit({
        id: editingWorkflow._id,
        name: updates.name,
        description: updates.description,
        instructions: updates.instructions,
        rootNodeId: editingWorkflow.rootNodeId,
        isPublic: editingWorkflow.isPublic,
        userId: editingWorkflow.userId,
      })
      // Clear the editing workflow
      setEditingWorkflow(null)
    },
    [editingWorkflow, edit],
  )

  const handleStopWorkflow = useCallback(
    (workflowId: Id<"workflows">) => {
      const execution = getWorkflowExecution(workflowId)
      if (execution) {
        stopWorkflow(workflowId, execution._id)
      }
    },
    [getWorkflowExecution, stopWorkflow],
  )

  return (
    <>
      <div className="flex h-full bg-background overflow-hidden">
        {/* Left Sidebar */}
        <WorkflowSidebar
          selectedWorkflowId={selectedWorkflowId}
          onSelectWorkflow={handleSelectWorkflow}
          onCreateWorkflow={handleCreateWorkflow}
          onEditWorkflow={handleEditWorkflow}
          onDeleteWorkflow={handleDeleteWorkflow}
          onCloneWorkflow={handleCloneWorkflow}
          onRunWorkflow={runWorkflow}
          onStopWorkflow={handleStopWorkflow}
          onGenerateWorkflow={handleGenerateWorkflow}
        />
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-x-auto">
          {selectedWorkflow ? (
            <WorkflowContentArea
              workflow={selectedWorkflow}
              workflowNodes={workflowNodes}
              workflowExecutions={executions}
              onEditWorkflow={handleEditWorkflow}
              onRunWorkflow={runWorkflow}
              onStopWorkflow={stopWorkflow}
              onRemoveNode={handleRemoveNode}
              onChangeNodeAgent={handleChangeNodeAgent}
              onAddStepWithAgent={handleAddStepWithAgent}
              onAddFirstStep={handleAddFirstStep}
              getModel={getModelWrapper}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                {selectedWorkflowId ? "Workflow does not exist" : "Select a workflow"}
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Delete Confirmation Dialog */}
      <WorkflowDeleteDialog
        workflow={workflowToDelete}
        open={!!workflowToDelete}
        onOpenChange={handleWorkflowDeleteDialogChange}
        onConfirm={handleConfirmDeleteWorkflow}
      />
      {/* Metadata Edit Dialog */}
      {editingWorkflow && (
        <WorkflowMetadataDialog
          workflow={editingWorkflow}
          open={isMetadataDialogOpen}
          onOpenChange={handleMetadataDialogChange}
          onSave={handleSaveWorkflowMetadata}
        />
      )}
      {/* Node Delete Confirmation Dialog */}
      <NodeDeleteDialog
        node={nodeToDelete}
        agent={getAgentForNode(nodeToDelete?.agentId)}
        open={!!nodeToDelete}
        onOpenChange={handleNodeDeleteDialogChange}
        onConfirm={confirmDeleteNode}
      />
      {/* Generate Workflow Dialog */}
      <WorkflowGenerateDialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen} />
    </>
  )
}
