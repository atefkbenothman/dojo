"use client"

import { AgentDialog } from "@/components/agent/agent-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkflowBuilder } from "@/components/workflow/canvas/workflow-builder"
import { WorkflowRunner } from "@/components/workflow/runner/workflow-runner"
import { WorkflowDeleteDialog } from "@/components/workflow/workflow-delete-dialog"
import { WorkflowMetadataDialog } from "@/components/workflow/workflow-metadata-dialog"
import { WorkflowSidebar } from "@/components/workflow/workflow-sidebar"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useWorkflow } from "@/hooks/use-workflow"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow as WorkflowType, Agent } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useCallback, useMemo, memo, useEffect } from "react"

export const Workflow = memo(function Workflow() {
  const { workflows, create, edit, remove, runWorkflow, stopWorkflow, getWorkflowExecution } = useWorkflow()
  const { agents } = useAgent()
  const { getModel } = useAIModels()
  const { isAuthenticated } = useConvexAuth()

  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | null>(null)
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowType | null>(null)
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"build" | "run">("build")
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowType | null>(null)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false)

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
      router.replace(`/workflow?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
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
      steps: [],
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
    },
    [selectedWorkflow, updateUrlWithWorkflow],
  )

  const handleAddFirstStep = useCallback(
    async (agent: Agent) => {
      if (!selectedWorkflow) return
      const newSteps = [agent._id]
      await edit({
        id: selectedWorkflow._id,
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        instructions: selectedWorkflow.instructions,
        steps: newSteps,
        isPublic: selectedWorkflow.isPublic,
        userId: selectedWorkflow.userId,
      })
      setSelectedWorkflow({
        ...selectedWorkflow,
        steps: newSteps,
      })
    },
    [selectedWorkflow, edit],
  )

  const handleAddStepAtIndex = useCallback(
    async (index: number, agent: Agent) => {
      if (!selectedWorkflow) return
      const newSteps = [...selectedWorkflow.steps]
      newSteps.splice(index + 1, 0, agent._id)
      await edit({
        id: selectedWorkflow._id,
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        instructions: selectedWorkflow.instructions,
        steps: newSteps,
        isPublic: selectedWorkflow.isPublic,
        userId: selectedWorkflow.userId,
      })
      setSelectedWorkflow({
        ...selectedWorkflow,
        steps: newSteps,
      })
    },
    [selectedWorkflow, edit],
  )

  const handleRemoveStep = useCallback(
    async (index: number) => {
      if (!selectedWorkflow) return
      const newSteps = selectedWorkflow.steps.filter((_, i) => i !== index)
      await edit({
        id: selectedWorkflow._id,
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        instructions: selectedWorkflow.instructions,
        steps: newSteps,
        isPublic: selectedWorkflow.isPublic,
        userId: selectedWorkflow.userId,
      })
      setSelectedWorkflow({
        ...selectedWorkflow,
        steps: newSteps,
      })
    },
    [selectedWorkflow, edit],
  )

  const handleDuplicateStep = useCallback(
    async (index: number, stepId: Id<"agents">) => {
      if (!selectedWorkflow) return
      const newSteps = [...selectedWorkflow.steps]
      newSteps.splice(index + 1, 0, stepId)
      await edit({
        id: selectedWorkflow._id,
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        instructions: selectedWorkflow.instructions,
        steps: newSteps,
        isPublic: selectedWorkflow.isPublic,
        userId: selectedWorkflow.userId,
      })
      setSelectedWorkflow({
        ...selectedWorkflow,
        steps: newSteps,
      })
    },
    [selectedWorkflow, edit],
  )

  const handleConfigure = useCallback(
    (index: number) => {
      if (!selectedWorkflow) return
      const stepId = selectedWorkflow.steps[index]
      const agent = agents.find((a) => a._id === stepId)
      if (agent) {
        setEditingAgent(agent)
        setIsAgentDialogOpen(true)
      }
    },
    [selectedWorkflow, agents],
  )

  const handleViewLogs = useCallback(() => {
    setActiveTab("run")
  }, [])

  // Create a wrapper for getModel that accepts string
  const getModelWrapper = useCallback(
    (modelId: string) => {
      const model = getModel(modelId as Id<"models">)
      return model ? { name: model.name } : undefined
    },
    [getModel],
  )

  // Handler to update workflow steps (for drag & drop)
  const handleUpdateSteps = useCallback(
    async (newSteps: Id<"agents">[]) => {
      if (!selectedWorkflow) return
      await edit({
        id: selectedWorkflow._id,
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        instructions: selectedWorkflow.instructions,
        steps: newSteps,
        isPublic: selectedWorkflow.isPublic,
        userId: selectedWorkflow.userId,
      })
      setSelectedWorkflow({
        ...selectedWorkflow,
        steps: newSteps,
      })
    },
    [selectedWorkflow, edit],
  )

  const handleSaveWorkflowMetadata = useCallback(
    async (updates: { name: string; description: string; instructions: string }) => {
      if (!editingWorkflow) return
      await edit({
        id: editingWorkflow._id,
        name: updates.name,
        description: updates.description,
        instructions: updates.instructions,
        steps: editingWorkflow.steps,
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

  return (
    <>
      <div className="flex h-full bg-background">
        {/* Left Sidebar */}
        <div className="w-96 bg-card border-r-[1.5px] flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b-[1.5px] flex-shrink-0 flex items-center justify-between">
            <p className="text-sm font-semibold">Workflows</p>
            <span className="text-xs text-muted-foreground">{workflows.length} total</span>
          </div>
          {/* Workflow List */}
          <WorkflowSidebar
            workflows={workflows}
            selectedWorkflowId={selectedWorkflow?._id || null}
            isAuthenticated={isAuthenticated}
            workflowExecutions={workflowExecutions}
            agents={agents || []}
            onSelectWorkflow={handleSelectWorkflow}
            onCreateWorkflow={handleCreateWorkflow}
            onEditWorkflow={handleEditWorkflow}
            onDeleteWorkflow={handleDeleteWorkflow}
            onRunWorkflow={runWorkflow}
            onStopWorkflow={stopWorkflow}
          />
        </div>
        {/* Main Content */}
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
        />
      )}
    </>
  )
})

//  <div className="flex flex-col h-full bg-green-500">
//  <div className="flex flex-col gap-4 p-4 sticky top-0 z-30 bg-blue-500 w-96">
//    {/* Main Header */}
//    <div className="flex flex-col gap-1 border-b-[1.5px] pb-4 -my-4 py-4 -mx-4 px-4 bg-card w-96 border-r-[1.5px] bg-yellow-500">
//      <div className="flex items-center gap-70">
//        <p className="text-sm font-semibold">Workflows</p>
//      </div>
//    </div>
//  </div>
//
//  {/* 2-column layout with bottom panel */}
//  <div className="flex flex-row flex-1 min-h-0">
//    {/* Left sidebar - Workflows list */}
//    <WorkflowSidebar
//      workflows={workflows}
//      selectedWorkflow={selectedWorkflow}
//      isAuthenticated={isAuthenticated}
//      workflowExecutions={workflowExecutions}
//      agents={agents || []}
//      onSelectWorkflow={handleSelectWorkflow}
//      onCreateWorkflow={handleCreateWorkflow}
//      onEditWorkflow={handleEditWorkflow}
//      onDeleteWorkflow={handleDeleteWorkflow}
//      onRunWorkflow={runWorkflow}
//      onStopWorkflow={stopWorkflow}
//    />
//
//    {/* Main area - Flow canvas with tab bar */}
//    <div className="flex-1 flex flex-col overflow-hidden">
//      {selectedWorkflow ? (
//        <Tabs
//          value={activeTab}
//          onValueChange={(value) => setActiveTab(value as "build" | "run")}
//          className="h-full flex flex-col bg-red-400"
//        >
//          {/* Tab bar header */}
//          <div className="p-4 border-b">
//            <div className="flex items-center justify-between">
//              <TabsList className="h-9 w-64">
//                <TabsTrigger value="build" className="flex-1">
//                  Build
//                </TabsTrigger>
//                <TabsTrigger value="run" className="flex-1">
//                  Run
//                </TabsTrigger>
//              </TabsList>
//            </div>
//          </div>
//
//          <TabsContent value="build" className="flex-1 overflow-hidden">
//            {activeTab === "build" && (
//              <WorkflowBuilder
//                workflow={selectedWorkflow}
//                agents={agents || []}
//                isAuthenticated={isAuthenticated}
//                workflowExecutions={workflowExecutions}
//                getModel={getModelWrapper}
//                onEditMetadata={() => setIsMetadataDialogOpen(true)}
//                onAddFirstStep={handleAddFirstStep}
//                onAddStepAtIndex={handleAddStepAtIndex}
//                onRemoveStep={handleRemoveStep}
//                onDuplicateStep={handleDuplicateStep}
//                onConfigureStep={handleConfigure}
//                onUpdateSteps={handleUpdateSteps}
//                onViewLogs={handleViewLogs}
//              />
//            )}
//          </TabsContent>
//
//          <TabsContent value="run" className="flex-1 mt-0 overflow-hidden">
//            {activeTab === "run" && (
//              <WorkflowRunner
//                workflow={selectedWorkflow}
//                agents={agents || []}
//                isAuthenticated={isAuthenticated}
//                workflowExecutions={workflowExecutions}
//                onRunWorkflow={runWorkflow}
//                onStopWorkflow={stopWorkflow}
//              />
//            )}
//          </TabsContent>
//        </Tabs>
//      ) : (
//        <div className="flex items-center justify-center h-full">
//          <p className="text-sm text-muted-foreground">Select a workflow to view its flow</p>
//        </div>
//      )}
//    </div>
//  </div>
//

//

//
//  {/* Agent Edit Dialog */}
//  {editingAgent && (
//    <AgentDialog
//      mode="edit"
//      agent={editingAgent}
//      open={isAgentDialogOpen}
//      onOpenChange={(open) => {
//        if (!open) {
//          setIsAgentDialogOpen(false)
//          setEditingAgent(null)
//        }
//      }}
//      isAuthenticated={isAuthenticated}
//    />
//  )}
//  </div>
