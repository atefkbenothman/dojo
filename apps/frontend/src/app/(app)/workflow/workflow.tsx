"use client"

import { useState, useCallback } from "react"
import { NodeDeleteDialog } from "@/components/workflow/node-delete-dialog"
import { WorkflowContentArea } from "@/components/workflow/workflow-content-area"
import { WorkflowDeleteDialog } from "@/components/workflow/workflow-delete-dialog"
import { WorkflowGenerateDialog } from "@/components/workflow/workflow-generate-dialog"
import { WorkflowMetadataDialog } from "@/components/workflow/workflow-metadata-dialog"
import { WorkflowSidebar } from "@/components/workflow/workflow-sidebar"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useAuth } from "@/hooks/use-auth"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { useWorkflow } from "@/hooks/use-workflow"
import { useWorkflowNodes } from "@/hooks/use-workflow-nodes"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow as WorkflowType } from "@dojo/db/convex/types"

export function Workflow() {
  const { isAuthenticated } = useAuth()
  const { selectedId: selectedWorkflowId, setSelectedId: setSelectedWorkflowId } = useUrlSelection()

  // Get all workflow data and operations from the enhanced hook
  const { workflows, selectedWorkflow, workflowNodes, executions, getWorkflowExecution, create, edit, remove, runWorkflow, stopWorkflow, clone } = useWorkflow()
  const { agents } = useAgent()
  const { getModel } = useAIModels()

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

  const handleNodeDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setNodeToDelete(null)
    }
  }, [])

  const getAgentForNode = useCallback(
    (agentId?: string) => {
      if (!agentId || !agents) return undefined
      return agents.find((a) => a._id === agentId)
    },
    [agents],
  )

  const handleConfirmDeleteWorkflow = useCallback(async () => {
    if (workflowToDelete) {
      await remove({ id: workflowToDelete._id })
      // If the deleted workflow was selected, clear the selection
      if (selectedWorkflowId === workflowToDelete._id) {
        setSelectedWorkflowId(null)
      }
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
          <WorkflowContentArea
            selectedWorkflowId={selectedWorkflowId}
            onEditWorkflow={handleEditWorkflow}
            onRunWorkflow={runWorkflow}
            onStopWorkflow={stopWorkflow}
            onRemoveNode={handleRemoveNode}
            onChangeNodeAgent={handleChangeNodeAgent}
            onAddStepWithAgent={handleAddStepWithAgent}
            onAddFirstStep={handleAddFirstStep}
            getModel={getModelWrapper}
          />
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
          isAuthenticated={isAuthenticated}
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
      <WorkflowGenerateDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        isAuthenticated={isAuthenticated}
      />
    </>
  )
}
