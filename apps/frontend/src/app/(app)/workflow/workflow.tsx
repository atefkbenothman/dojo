"use client"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReactFlowWorkflowCanvas } from "@/components/workflow/canvas/reactflow-workflow-canvas"
import { NodeDeleteDialog } from "@/components/workflow/node-delete-dialog"
import { WorkflowRunner } from "@/components/workflow/runner/workflow-runner"
import { WorkflowDeleteDialog } from "@/components/workflow/workflow-delete-dialog"
import { WorkflowGenerateDialog } from "@/components/workflow/workflow-generate-dialog"
import { WorkflowMetadataDialog } from "@/components/workflow/workflow-metadata-dialog"
import { WorkflowSidebar } from "@/components/workflow/workflow-sidebar"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useWorkflow } from "@/hooks/use-workflow"
import { cn } from "@/lib/utils"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow as WorkflowType, Agent } from "@dojo/db/convex/types"
import { useConvexAuth, useMutation } from "convex/react"
import { Play, Pencil, PanelLeft, PanelRight } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState, useCallback, useMemo, memo, useEffect } from "react"

export const Workflow = memo(function Workflow() {
  const searchParams = useSearchParams()

  const { isAuthenticated } = useConvexAuth()
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | null>(null)
  const { workflows, create, edit, remove, runWorkflow, stopWorkflow, getWorkflowExecution, clone, workflowNodes } =
    useWorkflow(selectedWorkflow)
  const { agents } = useAgent()
  const { getModel } = useAIModels()

  // Tree operation mutations
  const addNodeMutation = useMutation(api.workflows.addNode)
  const removeNodeMutation = useMutation(api.workflows.removeNode)
  const updateNodeMutation = useMutation(api.workflows.updateNode)
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowType | null>(null)
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"build" | "run">("build")
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowType | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<{
    nodeId: string
    type: "step"
    label?: string
    agentId?: string
  } | null>(null)
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)

  // Load workflow from URL on mount and when workflows change
  useEffect(() => {
    const workflowId = searchParams.get("id")
    if (workflowId && workflows.length > 0) {
      const workflow = workflows.find((w) => w._id === workflowId)
      if (workflow && (!selectedWorkflow || selectedWorkflow._id !== workflow._id)) {
        setSelectedWorkflow(workflow)
      }
    }
  }, [searchParams, workflows, selectedWorkflow])

  // Update URL when workflow selection changes
  const updateUrlWithWorkflow = useCallback(
    (workflow: WorkflowType | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (workflow) {
        params.set("id", workflow._id)
      } else {
        params.delete("id")
      }
      // Use window.history.replaceState to avoid component remount
      window.history.replaceState(null, "", `/workflow?${params.toString()}`)
    },
    [searchParams],
  )

  // Create a map of workflow executions for efficient lookup
  const workflowExecutions = useMemo(() => {
    const executionMap = new Map()
    workflows.forEach((workflow) => {
      const execution = getWorkflowExecution(workflow._id)
      if (execution) {
        executionMap.set(workflow._id, execution)
      }
    })
    return executionMap
  }, [workflows, getWorkflowExecution])

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
      // If the deleted workflow was selected, clear the selection and URL
      if (selectedWorkflow?._id === workflowToDelete._id) {
        setSelectedWorkflow(null)
        updateUrlWithWorkflow(null)
      }
      setWorkflowToDelete(null)
    }
  }, [remove, selectedWorkflow, workflowToDelete, updateUrlWithWorkflow])

  const handleCreateWorkflow = useCallback(async () => {
    const newWorkflow = {
      name: "Untitled Workflow",
      description: "",
      instructions: "",
      isPublic: false,
    }

    // Create the workflow
    const workflowId = await create(newWorkflow)

    // Auto-select the newly created workflow and update URL
    if (workflowId) {
      // Find the created workflow from the list
      // We'll use a small timeout to ensure the list has updated
      setTimeout(() => {
        const createdWorkflow = workflows.find((w) => w._id === workflowId)
        if (createdWorkflow) {
          setSelectedWorkflow(createdWorkflow)
          updateUrlWithWorkflow(createdWorkflow)
        }
      }, 100)
    }
  }, [create, workflows, updateUrlWithWorkflow])

  const handleSelectWorkflow = useCallback(
    (workflow: WorkflowType) => {
      // Toggle selection - if clicking the same workflow, unselect it
      const newSelection = selectedWorkflow?._id === workflow._id ? null : workflow
      setSelectedWorkflow(newSelection)
      updateUrlWithWorkflow(newSelection)
      // Note: activeTab state is preserved automatically when switching workflows
    },
    [selectedWorkflow, updateUrlWithWorkflow],
  )

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      if (!workflowNodes) return

      // Find the node to get its details for the confirmation dialog
      const node = workflowNodes.find((n) => n.nodeId === nodeId)
      if (node) {
        setNodeToDelete({
          nodeId: node.nodeId,
          type: node.type,
          label: node.label,
          agentId: node.agentId,
        })
      }
    },
    [workflowNodes],
  )

  const confirmDeleteNode = useCallback(async () => {
    if (!nodeToDelete || !selectedWorkflow || !isAuthenticated) return

    try {
      await removeNodeMutation({
        workflowId: selectedWorkflow._id,
        nodeId: nodeToDelete.nodeId,
      })
      setNodeToDelete(null)
    } catch (error) {
      console.error("Failed to remove node:", error)
    }
  }, [nodeToDelete, selectedWorkflow, isAuthenticated, removeNodeMutation])

  const handleChangeNodeAgent = useCallback(
    async (nodeId: string, agent: Agent) => {
      if (!selectedWorkflow || !isAuthenticated) return

      try {
        await updateNodeMutation({
          workflowId: selectedWorkflow._id,
          nodeId: nodeId,
          agentId: agent._id,
          label: agent.name, // Update label to agent name
        })
      } catch (error) {
        console.error("Failed to assign agent:", error)
      }
    },
    [selectedWorkflow, isAuthenticated, updateNodeMutation],
  )

  const handleAddStepWithAgent = useCallback(
    async (parentNodeId: string, agent: Agent) => {
      if (!selectedWorkflow || !isAuthenticated) return

      try {
        // Generate a unique node ID
        const nodeId = `node_${Date.now()}`

        // Create the node with agent assigned in one operation
        await addNodeMutation({
          workflowId: selectedWorkflow._id,
          nodeId,
          parentNodeId,
          type: "step",
          agentId: agent._id,
          label: agent.name,
          order: 0,
        })
      } catch (error) {
        console.error("Failed to add step with agent:", error)
      }
    },
    [selectedWorkflow, isAuthenticated, addNodeMutation],
  )

  const handleAddFirstStep = useCallback(
    async (agent: Agent) => {
      if (!selectedWorkflow || !isAuthenticated) return

      try {
        // Generate a unique node ID for the first step
        const nodeId = `node_${Date.now()}`

        // Create the first node as root node
        await addNodeMutation({
          workflowId: selectedWorkflow._id,
          nodeId,
          parentNodeId: undefined, // No parent = root node
          type: "step",
          agentId: agent._id,
          label: agent.name,
          order: 0,
        })

        // Update the workflow's rootNodeId to point to this first node
        await edit({
          id: selectedWorkflow._id,
          name: selectedWorkflow.name,
          description: selectedWorkflow.description,
          instructions: selectedWorkflow.instructions,
          rootNodeId: nodeId, // Update to point to the first actual step
          isPublic: selectedWorkflow.isPublic,
          userId: selectedWorkflow.userId,
        })
      } catch (error) {
        console.error("Failed to add first step:", error)
      }
    },
    [selectedWorkflow, isAuthenticated, addNodeMutation, edit],
  )

  const handleRunWorkflow = useCallback(async () => {
    if (!selectedWorkflow) return
    await runWorkflow(selectedWorkflow)
  }, [selectedWorkflow, runWorkflow])

  // Create a wrapper for getModel that accepts string
  const getModelWrapper = useCallback(
    (modelId: string) => {
      const model = getModel(modelId as Id<"models">)
      return model ? { name: model.name } : undefined
    },
    [getModel],
  )

  // Memoize the agents array to prevent unnecessary re-renders
  const stableAgents = useMemo(() => agents || [], [agents])

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
      // If we're editing the currently selected workflow, update it too
      if (selectedWorkflow && selectedWorkflow._id === editingWorkflow._id) {
        setSelectedWorkflow({
          ...selectedWorkflow,
          ...updates,
        })
      }
      // Clear the editing workflow
      setEditingWorkflow(null)
    },
    [editingWorkflow, selectedWorkflow, edit],
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

  return (
    <>
      <div className="flex h-full bg-background overflow-hidden">
        {/* Left Sidebar */}
        <div
          className={cn(
            "shrink-0 bg-card border-r-[1.5px] flex flex-col h-full",
            isSidebarCollapsed ? "w-[42px]" : "w-96",
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "border-b-[1.5px] flex-shrink-0 flex items-center h-[42px]",
              isSidebarCollapsed ? "justify-center" : "justify-between p-4",
            )}
          >
            {!isSidebarCollapsed && <p className="text-sm font-semibold">Workflows</p>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn("hover:cursor-pointer", !isSidebarCollapsed && "ml-auto")}
            >
              {isSidebarCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </div>
          {/* Workflow List */}
          <WorkflowSidebar
            workflows={workflows}
            selectedWorkflowId={selectedWorkflow?._id || null}
            isAuthenticated={isAuthenticated}
            workflowExecutions={workflowExecutions}
            agents={stableAgents}
            workflowNodes={workflowNodes || []}
            onSelectWorkflow={handleSelectWorkflow}
            onCreateWorkflow={handleCreateWorkflow}
            onEditWorkflow={handleEditWorkflow}
            onDeleteWorkflow={handleDeleteWorkflow}
            onCloneWorkflow={handleCloneWorkflow}
            onRunWorkflow={runWorkflow}
            onStopWorkflow={stopWorkflow}
            onGenerateWorkflow={handleGenerateWorkflow}
            isCollapsed={isSidebarCollapsed}
            onExpandSidebar={() => setIsSidebarCollapsed(false)}
          />
        </div>
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-x-auto">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "build" | "run")}
            className="h-full flex flex-col gap-0"
          >
            {selectedWorkflow ? (
              <>
                {/* Header */}
                <div className="border-b-[1.5px] flex-shrink-0 bg-card h-[42px] overflow-x-auto">
                  <div className="px-4 grid grid-cols-3 items-center h-full min-w-fit">
                    {/* Left section - Name and Edit */}
                    <div className="flex items-center gap-2 justify-start">
                      <p className="text-sm font-semibold whitespace-nowrap truncate">{selectedWorkflow?.name}</p>
                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingWorkflow(selectedWorkflow)
                          setIsMetadataDialogOpen(true)
                        }}
                        className="hover:cursor-pointer flex-shrink-0 h-8 w-8"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>

                    {/* Center section - Tabs */}
                    <div className="flex items-center justify-center">
                      <TabsList className="h-8 w-40">
                        <TabsTrigger value="build" className="text-xs">
                          Build
                        </TabsTrigger>
                        <TabsTrigger value="run" className="text-xs">
                          Logs
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Right section - Run button */}
                    <div className="flex items-center justify-end">
                      <Button
                        size="sm"
                        className="bg-green-700 hover:bg-green-800 text-white border-green-500 border-[1px] hover:border-green-800 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-700 h-8"
                        onClick={handleRunWorkflow}
                        disabled={
                          !selectedWorkflow.instructions ||
                          selectedWorkflow.instructions.trim() === "" ||
                          !selectedWorkflow.rootNodeId
                        }
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tab Content */}
                <TabsContent value="build" className="flex-1 overflow-hidden gap-0">
                  <ReactFlowWorkflowCanvas
                    workflow={selectedWorkflow}
                    agents={stableAgents}
                    workflowNodes={workflowNodes || []}
                    isAuthenticated={isAuthenticated}
                    workflowExecutions={workflowExecutions}
                    getModel={getModelWrapper}
                    onAddFirstStep={handleAddFirstStep}
                    onEditMetadata={() => {
                      setEditingWorkflow(selectedWorkflow)
                      setIsMetadataDialogOpen(true)
                    }}
                    onRemoveNode={handleRemoveNode}
                    onChangeNodeAgent={handleChangeNodeAgent}
                    onAddStepWithAgent={handleAddStepWithAgent}
                  />
                </TabsContent>
                <TabsContent value="run" className="flex-1 mt-0 overflow-hidden">
                  <WorkflowRunner
                    workflow={selectedWorkflow}
                    agents={stableAgents}
                    isAuthenticated={isAuthenticated}
                    workflowExecutions={workflowExecutions}
                    workflowNodes={workflowNodes || []}
                    onRunWorkflow={runWorkflow}
                    onStopWorkflow={stopWorkflow}
                  />
                </TabsContent>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Select a workflow</p>
              </div>
            )}
          </Tabs>
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
})
