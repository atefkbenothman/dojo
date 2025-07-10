"use client"

import { AgentFormDialog } from "@/components/agent/agent-form-dialog"
import { NodeDeleteDialog } from "@/components/workflow/node-delete-dialog"
import { WorkflowContentArea } from "@/components/workflow/workflow-content-area"
import { WorkflowDeleteDialog } from "@/components/workflow/workflow-delete-dialog"
import { WorkflowGenerateDialog } from "@/components/workflow/workflow-generate-dialog"
import { WorkflowMetadataDialog } from "@/components/workflow/workflow-metadata-dialog"
import { WorkflowSidebar } from "@/components/workflow/workflow-sidebar"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useAuth } from "@/hooks/use-auth"
import { useMCP } from "@/hooks/use-mcp"
import { useStableQuery } from "@/hooks/use-stable-query"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { useWorkflow } from "@/hooks/use-workflow"
import { useWorkflowNodes } from "@/hooks/use-workflow-nodes"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow as WorkflowType, Agent } from "@dojo/db/convex/types"
import { useState, useCallback } from "react"

export function Workflow() {
  const { isAuthenticated } = useAuth()
  const { selectedId: selectedWorkflowId, setSelectedId: setSelectedWorkflowId } = useUrlSelection()

  // Get all workflow data and operations from the hook
  const { executions, getWorkflowExecution, create, edit, remove, runWorkflow, stopWorkflow, clone } = useWorkflow()
  const { agents } = useAgent()
  const { getModel } = useAIModels()
  const { mcpServers } = useMCP()

  // Find selected workflow and its nodes in a single query
  const selectedWorkflowWithNodes = useStableQuery(
    api.workflows.getWithNodes,
    selectedWorkflowId ? { id: selectedWorkflowId as Id<"workflows"> } : "skip",
  )

  // Extract workflow and nodes from the combined result
  // Explicitly handle deselection - when selectedWorkflowId is null, force workflow to null
  // This prevents useStableQuery from keeping stale data when query becomes "skip"
  const selectedWorkflow = selectedWorkflowId && selectedWorkflowWithNodes ? selectedWorkflowWithNodes.workflow : null
  const workflowNodes = selectedWorkflowId && selectedWorkflowWithNodes ? selectedWorkflowWithNodes.nodes : []

  // Get node operations
  const {
    nodeToDelete,
    setNodeToDelete,
    handleRemoveNode,
    confirmDeleteNode,
    handleChangeNodeAgent,
    handleAddStepWithAgent,
    handleAddFirstStep,
    handleInsertAsNewRoot,
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
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false)

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

  const getMcpServerWrapper = useCallback(
    (serverId: string) => {
      const server = mcpServers.find((s) => s._id === serverId)
      return server ? { name: server.name } : undefined
    },
    [mcpServers],
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

  const handleEditAgent = useCallback((agent: Agent) => {
    setEditingAgent(agent)
    setIsAgentDialogOpen(true)
  }, [])

  const handleAgentDialogChange = useCallback((open: boolean) => {
    setIsAgentDialogOpen(open)
    if (!open) {
      setEditingAgent(null)
    }
  }, [])

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

  // Conditional handler for adding steps from instructions
  const handleAddStepToInstructions = useCallback(
    (agent: Agent) => {
      if (workflowNodes.length === 0) {
        // Empty workflow - create first root node
        handleAddFirstStep(agent)
      } else {
        // Workflow has nodes - insert as new root
        handleInsertAsNewRoot(agent)
      }
    },
    [workflowNodes.length, handleAddFirstStep, handleInsertAsNewRoot],
  )

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
              onEditAgent={handleEditAgent}
              onAddStepWithAgent={handleAddStepWithAgent}
              onAddFirstStep={handleAddStepToInstructions}
              getModel={getModelWrapper}
              getMcpServer={getMcpServerWrapper}
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
          key={`${editingWorkflow._id}-${isMetadataDialogOpen}`}
          workflow={editingWorkflow}
          open={isMetadataDialogOpen}
          onOpenChange={handleMetadataDialogChange}
          onSave={handleSaveWorkflowMetadata}
        />
      )}
      {/* Agent Edit Dialog */}
      {editingAgent && (
        <AgentFormDialog
          mode="edit"
          agent={editingAgent}
          open={isAgentDialogOpen}
          onOpenChange={handleAgentDialogChange}
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
