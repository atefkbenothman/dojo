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
import { useSession } from "@/providers/session-provider"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow as WorkflowType } from "@dojo/db/convex/types"
import { useState, useCallback, useMemo } from "react"

export function Workflow() {
  const { isAuthenticated } = useAuth()
  const { currentSession } = useSession()
  const { selectedId: selectedWorkflowId, setSelectedId: setSelectedWorkflowId } = useUrlSelection()

  // Separate stable workflow data from real-time execution data
  const workflows = useStableQuery(api.workflows.list)

  const selectedWorkflow = useStableQuery(
    api.workflows.get,
    selectedWorkflowId ? { id: selectedWorkflowId as Id<"workflows"> } : "skip",
  )

  // Real-time execution data - isolated from stable workflow data
  const workflowExecutions = useStableQuery(
    api.workflowExecutions.getBySession,
    currentSession ? { sessionId: currentSession._id } : "skip",
  )

  // Get workflow nodes for the selected workflow
  const workflowNodes = useStableQuery(
    api.workflows.getWorkflowNodes,
    selectedWorkflowId ? { workflowId: selectedWorkflowId as Id<"workflows"> } : "skip",
  )

  // Get workflow operations (CRUD functions)
  const { create, edit, remove, runWorkflow, stopWorkflow, clone } = useWorkflow()
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
    workflowNodes: workflowNodes || [],
    isAuthenticated,
    onEditWorkflow: edit,
  })

  // Memoize arrays to prevent unnecessary re-renders
  const stableWorkflows = useMemo(() => workflows || [], [workflows])
  const stableAgents = useMemo(() => agents || [], [agents])
  const stableWorkflowNodes = useMemo(() => workflowNodes || [], [workflowNodes])
  const stableWorkflowExecutions = useMemo(() => workflowExecutions || [], [workflowExecutions])

  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowType | null>(null)
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowType | null>(null)
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)

  // Create a stable array of workflow executions (similar to Agent page pattern)
  const executions = useMemo(() => {
    if (!stableWorkflowExecutions) return []
    return stableWorkflowExecutions
  }, [stableWorkflowExecutions])

  // Helper function to get active execution for a workflow - following Agent pattern
  const getWorkflowExecution = useCallback(
    (workflowId: Id<"workflows">) => {
      if (!executions) return null
      // Get the most recent execution for this workflow
      const workflowExecutions = executions
        .filter((exec) => exec.workflowId === workflowId)
        .sort((a, b) => b.startedAt - a.startedAt)
      return workflowExecutions[0] || null
    },
    [executions],
  )

  const handleEditWorkflow = useCallback((workflow: WorkflowType) => {
    setEditingWorkflow(workflow)
    setIsMetadataDialogOpen(true)
  }, [])

  const handleDeleteWorkflow = useCallback((workflow: WorkflowType) => {
    setWorkflowToDelete(workflow)
  }, [])

  const confirmDeleteWorkflow = useCallback(async () => {
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

  // Create a wrapper for getModel that accepts string
  const getModelWrapper = useCallback(
    (modelId: string) => {
      const model = getModel(modelId as Id<"models">)
      return model ? { name: model.name } : undefined
    },
    [getModel],
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

  const handleCloneWorkflow = useCallback(
    async (workflow: WorkflowType) => {
      await clone(workflow._id)
    },
    [clone],
  )

  const handleGenerateWorkflow = useCallback(() => {
    setIsGenerateDialogOpen(true)
  }, [])

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
          workflows={stableWorkflows}
          selectedWorkflowId={selectedWorkflowId}
          isAuthenticated={isAuthenticated}
          workflowExecutions={executions}
          agents={stableAgents}
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
            workflow={selectedWorkflow || null}
            selectedWorkflowId={selectedWorkflowId}
            workflows={stableWorkflows}
            agents={stableAgents}
            workflowNodes={stableWorkflowNodes}
            workflowExecutions={executions}
            isAuthenticated={isAuthenticated}
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
        onOpenChange={(open) => !open && setWorkflowToDelete(null)}
        onConfirm={confirmDeleteWorkflow}
      />
      {/* Metadata Edit Dialog */}
      {editingWorkflow && (
        <WorkflowMetadataDialog
          workflow={editingWorkflow}
          open={isMetadataDialogOpen}
          onOpenChange={(open) => {
            setIsMetadataDialogOpen(open)
            if (!open) {
              setEditingWorkflow(null)
            }
          }}
          onSave={handleSaveWorkflowMetadata}
          isAuthenticated={isAuthenticated}
        />
      )}
      {/* Node Delete Confirmation Dialog */}
      <NodeDeleteDialog
        node={nodeToDelete}
        agent={nodeToDelete?.agentId ? agents?.find((a) => a._id === nodeToDelete.agentId) : undefined}
        open={!!nodeToDelete}
        onOpenChange={(open) => !open && setNodeToDelete(null)}
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
