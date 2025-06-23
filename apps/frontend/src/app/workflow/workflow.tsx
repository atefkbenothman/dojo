"use client"

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
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"build" | "run">("build")
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowType | null>(null)

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
      router.push(`/workflow?${params.toString()}`)
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
    setSelectedWorkflow(workflow)
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
    // Generate a smart default name with timestamp
    const now = new Date()
    const timestamp = now.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const newWorkflow = {
      name: `Untitled Workflow - ${timestamp}`,
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

  const handleConfigure = useCallback((index: number) => {
    // TODO: Open agent configuration dialog
    console.log("Configure step", index)
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 p-4 sticky top-0 z-30 bg-background">
        {/* Main Header */}
        <div className="flex flex-col gap-1 border-b-[1.5px] pb-4 -my-4 py-4 -mx-4 px-4 bg-card">
          <div className="flex items-center gap-70">
            <p className="text-sm font-semibold">Workflows</p>
          </div>
        </div>
      </div>

      {/* 2-column layout with bottom panel */}
      <div className="flex flex-row flex-1 min-h-0">
        {/* Left sidebar - Workflows list */}
        <WorkflowSidebar
          workflows={workflows}
          selectedWorkflow={selectedWorkflow}
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

        {/* Main area - Flow canvas with tab bar */}
        <div className="flex-1 flex flex-col overflow-hidden bg-none">
          {selectedWorkflow ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "build" | "run")}
              className="h-full flex flex-col bg-transparent"
            >
              {/* Tab bar header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <TabsList className="h-9 w-64">
                    <TabsTrigger value="build" className="flex-1">
                      Build
                    </TabsTrigger>
                    <TabsTrigger value="run" className="flex-1">
                      Run
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value="build" className="flex-1 mt-0 overflow-hidden bg-transparent">
                {activeTab === "build" && (
                  <WorkflowBuilder
                    workflow={selectedWorkflow}
                    agents={agents || []}
                    isAuthenticated={isAuthenticated}
                    workflowExecutions={workflowExecutions}
                    getModel={getModelWrapper}
                    onEditMetadata={() => setIsMetadataDialogOpen(true)}
                    onAddFirstStep={handleAddFirstStep}
                    onAddStepAtIndex={handleAddStepAtIndex}
                    onRemoveStep={handleRemoveStep}
                    onDuplicateStep={handleDuplicateStep}
                    onConfigureStep={handleConfigure}
                    onUpdateSteps={handleUpdateSteps}
                  />
                )}
              </TabsContent>

              <TabsContent value="run" className="flex-1 mt-0 overflow-hidden">
                {activeTab === "run" && (
                  <WorkflowRunner
                    workflow={selectedWorkflow}
                    agents={agents || []}
                    isAuthenticated={isAuthenticated}
                    workflowExecutions={workflowExecutions}
                    onRunWorkflow={runWorkflow}
                    onStopWorkflow={stopWorkflow}
                  />
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select a workflow to view its flow</p>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Edit Dialog */}
      {selectedWorkflow && (
        <WorkflowMetadataDialog
          workflow={selectedWorkflow}
          open={isMetadataDialogOpen}
          onOpenChange={setIsMetadataDialogOpen}
          onSave={async (updates) => {
            await edit({
              id: selectedWorkflow._id,
              name: updates.name,
              description: updates.description,
              instructions: updates.instructions,
              steps: selectedWorkflow.steps,
              isPublic: selectedWorkflow.isPublic,
              userId: selectedWorkflow.userId,
            })
            // Update local state to reflect changes
            setSelectedWorkflow({
              ...selectedWorkflow,
              ...updates,
            })
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <WorkflowDeleteDialog
        workflow={workflowToDelete}
        open={!!workflowToDelete}
        onOpenChange={(open) => !open && setWorkflowToDelete(null)}
        onConfirm={confirmDeleteWorkflow}
      />
    </div>
  )
})
