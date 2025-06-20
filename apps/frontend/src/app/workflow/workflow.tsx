"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddStepButton } from "@/components/workflow/add-step-button"
import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import { CanvasZoomControls } from "@/components/workflow/canvas-zoom-controls"
import { WorkflowCard } from "@/components/workflow/workflow-card"
import { WorkflowMetadataDialog } from "@/components/workflow/workflow-metadata-dialog"
import { WorkflowStep } from "@/components/workflow/workflow-step"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useCanvasZoom } from "@/hooks/use-canvas-zoom"
import { useDragAndDrop } from "@/hooks/use-drag-and-drop"
import { useWorkflow } from "@/hooks/use-workflow"
import { cn } from "@/lib/utils"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow as WorkflowType, Agent } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { Search, Edit, TriangleAlert } from "lucide-react"
import { useEffect, useState, useCallback, useMemo, memo, DragEvent, useRef } from "react"

export const Workflow = memo(function Workflow() {
  const { workflows, create, edit, remove, runWorkflow, getWorkflowExecution } =
    useWorkflow()
  const { agents } = useAgent()
  const { getModel } = useAIModels()
  const { isAuthenticated } = useConvexAuth()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowType[]>(workflows)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | null>(null)
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"build" | "run">("build")
  const [areAllStepsExpanded, setAreAllStepsExpanded] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowType | null>(null)

  // Set up drag and drop
  const { draggedIndex, dragOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop } =
    useDragAndDrop({
      items: selectedWorkflow?.steps || [],
      onReorder: async (newSteps) => {
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
    })

  // Set up canvas zoom
  const { zoom, pan, isPanning, containerRef, handleMouseDown, zoomIn, zoomOut } = useCanvasZoom({
    minZoom: 0.25,
    maxZoom: 2,
    zoomStep: 0.1,
  })


  // Create a map of workflow execution status for efficient lookup
  const workflowExecutionStatus = useMemo(() => {
    const statusMap = new Map<string, boolean>()
    workflows.forEach((workflow) => {
      const execution = getWorkflowExecution(workflow._id)
      statusMap.set(workflow._id, execution?.status === "preparing" || execution?.status === "running")
    })
    return statusMap
  }, [workflows, getWorkflowExecution])

  useEffect(() => {
    const filtered =
      searchInput === ""
        ? workflows
        : workflows.filter((workflow) => workflow.name.toLowerCase().includes(searchInput.toLowerCase()))
    setFilteredWorkflows(filtered)
  }, [searchInput, workflows])

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
      // If the deleted workflow was selected, clear the selection
      if (selectedWorkflow?._id === workflowToDelete._id) {
        setSelectedWorkflow(null)
      }
      setWorkflowToDelete(null)
    }
  }, [remove, selectedWorkflow, workflowToDelete])

  const handleSelectWorkflow = useCallback((workflow: WorkflowType) => {
    // Toggle selection - if clicking the same workflow, unselect it
    setSelectedWorkflow((prev) => (prev?._id === workflow._id ? null : workflow))
  }, [])


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
      // TODO: Open agent configuration dialog
      console.log("Configure step", index)
    },
    [],
  )

  // Create stable handler caches to prevent re-renders
  const dragStartHandlers = useMemo(() => new Map<number, (e: DragEvent) => void>(), [])
  const dragOverHandlers = useMemo(() => new Map<number, (e: DragEvent) => void>(), [])
  const dropHandlers = useMemo(() => new Map<number, (e: DragEvent) => void>(), [])
  const removeHandlers = useMemo(() => new Map<number, () => void>(), [])
  const configureHandlers = useMemo(() => new Map<number, () => void>(), [])
  const duplicateHandlers = useMemo(() => new Map<string, () => void>(), [])

  const getDragStartHandler = useCallback((index: number) => {
    if (!dragStartHandlers.has(index)) {
      dragStartHandlers.set(index, (e: DragEvent) => handleDragStart(e, index))
    }
    return dragStartHandlers.get(index)!
  }, [dragStartHandlers, handleDragStart])

  const getDragOverHandler = useCallback((index: number) => {
    if (!dragOverHandlers.has(index)) {
      dragOverHandlers.set(index, (e: DragEvent) => handleDragOver(e, index))
    }
    return dragOverHandlers.get(index)!
  }, [dragOverHandlers, handleDragOver])

  const getDropHandler = useCallback((index: number) => {
    if (!dropHandlers.has(index)) {
      dropHandlers.set(index, (e: DragEvent) => handleDrop(e, index))
    }
    return dropHandlers.get(index)!
  }, [dropHandlers, handleDrop])

  const getRemoveHandler = useCallback((index: number) => {
    if (!removeHandlers.has(index)) {
      removeHandlers.set(index, () => handleRemoveStep(index))
    }
    return removeHandlers.get(index)!
  }, [removeHandlers, handleRemoveStep])

  const getConfigureHandler = useCallback((index: number) => {
    if (!configureHandlers.has(index)) {
      configureHandlers.set(index, () => handleConfigure(index))
    }
    return configureHandlers.get(index)!
  }, [configureHandlers, handleConfigure])

  const getDuplicateHandler = useCallback((index: number, stepId: Id<"agents">) => {
    const key = `${index}-${stepId}`
    if (!duplicateHandlers.has(key)) {
      duplicateHandlers.set(key, () => handleDuplicateStep(index, stepId))
    }
    return duplicateHandlers.get(key)!
  }, [duplicateHandlers, handleDuplicateStep])

  // Create stable run handlers for each workflow to prevent re-renders
  const runHandlers = useMemo(() => new Map<string, (workflow: WorkflowType) => void>(), [])
  
  const getRunHandler = useCallback((workflowId: string) => {
    if (!runHandlers.has(workflowId)) {
      runHandlers.set(workflowId, (workflow: WorkflowType) => runWorkflow(workflow))
    }
    return runHandlers.get(workflowId)!
  }, [runHandlers, runWorkflow])

  // Stable add step handler for end of workflow - use ref to avoid recreating
  const selectedWorkflowRef = useRef(selectedWorkflow)
  selectedWorkflowRef.current = selectedWorkflow
  
  const handleAddAtEnd = useCallback((agent: Agent) => {
    if (selectedWorkflowRef.current) {
      handleAddStepAtIndex(selectedWorkflowRef.current.steps.length - 1, agent)
    }
  }, [handleAddStepAtIndex])

  // Render workflow steps
  const renderWorkflowSteps = () => {
    if (!selectedWorkflow) return null

    return (
      <div className="relative">
        {selectedWorkflow.steps.map((stepId, index) => {
          const agent = agents.find((a) => a._id === stepId)
          if (!agent) return null

          return (
            <div key={`${index}-${stepId}`} className="relative">
              <WorkflowStep
                step={agent}
                stepNumber={index + 1}
                modelName={getModel(agent.aiModelId)?.name}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                onDragStart={getDragStartHandler(index)}
                onDragEnd={handleDragEnd}
                onDragOver={getDragOverHandler(index)}
                onDragLeave={handleDragLeave}
                onDrop={getDropHandler(index)}
                onRemove={getRemoveHandler(index)}
                onConfigure={getConfigureHandler(index)}
                onDuplicate={getDuplicateHandler(index, stepId)}
                isExpanded={areAllStepsExpanded}
              />

              {/* Add connecting line between steps */}
              {index < selectedWorkflow.steps.length - 1 && (
                <div className="relative py-4 w-[280px] mx-auto">
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-border" />
                </div>
              )}
            </div>
          )
        })}

        {/* Single Add Step button at the end */}
        {selectedWorkflow.steps.length > 0 && (
          <AddStepButton agents={agents} onSelect={handleAddAtEnd} />
        )}
      </div>
    )
  }

  // Render workflow list content
  const renderWorkflowList = () => {
    if (filteredWorkflows.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-xs text-muted-foreground">
            {searchInput ? (
              "No workflows found"
            ) : (
              <>
                No workflows yet.
                <br />
                Create your first workflow below.
              </>
            )}
          </p>
        </div>
      )
    }

    return filteredWorkflows.map((workflow) => (
      <div key={workflow._id} className="cursor-pointer" onClick={() => handleSelectWorkflow(workflow)}>
        <WorkflowCard
          workflow={workflow}
          isAuthenticated={isAuthenticated}
          onEditClick={handleEditWorkflow}
          onDeleteClick={handleDeleteWorkflow}
          isSelected={selectedWorkflow?._id === workflow._id}
          onRun={getRunHandler(workflow._id)}
          isRunning={workflowExecutionStatus.get(workflow._id) || false}
        />
      </div>
    ))
  }

  // Canvas transform style
  const canvasTransformStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: "0 0",
    transition: isPanning ? "none" : "transform 0.05s ease-out",
    willChange: isPanning ? "transform" : "auto",
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 p-4 sticky top-0 z-30 bg-background">
        {/* Header */}
        <div className="flex flex-col gap-1 border-b-[1.5px] pb-4 -my-4 py-4 -mx-4 px-4 bg-card">
          <p className="text-sm font-semibold">Workflows</p>
        </div>
      </div>

      {/* 2-column layout with bottom panel */}
      <div className="flex flex-row flex-1 min-h-0">
        {/* Left sidebar - Workflows list */}
        <div className="w-96 border-r-[1.5px] flex flex-col flex-shrink-0 bg-card">
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">My Workflows</h3>
              <span className="text-xs text-muted-foreground">{workflows.length} total</span>
            </div>

            {/* Search input for workflows */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
              <Input
                placeholder="Search workflows..."
                className="h-9 pl-9 text-xs bg-background/50"
                onChange={(e) => setSearchInput(e.target.value)}
                value={searchInput}
              />
            </div>

            {/* Create workflow button */}
            <Button
              className="w-full h-10 bg-foreground text-background hover:bg-foreground/90 hover:cursor-pointer"
              onClick={async () => {
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

                // Auto-select the newly created workflow
                if (workflowId) {
                  // Find the created workflow from the list
                  // We'll use a small timeout to ensure the list has updated
                  setTimeout(() => {
                    const createdWorkflow = workflows.find((w) => w._id === workflowId)
                    if (createdWorkflow) {
                      setSelectedWorkflow(createdWorkflow)
                    }
                  }, 100)
                }
              }}
              disabled={!isAuthenticated}
            >
              Create Workflow
            </Button>

            {/* Scrollable workflow list */}
            <div className="flex flex-col gap-3 overflow-y-auto flex-1">{renderWorkflowList()}</div>
          </div>
        </div>

        {/* Main area - Flow canvas with tab bar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedWorkflow ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "build" | "run")}
              className="h-full flex flex-col"
            >
              <div className="px-4 pt-4 pb-0 flex items-center justify-between">
                <TabsList className="h-9 w-64">
                  <TabsTrigger value="build" className="flex-1">
                    Build
                  </TabsTrigger>
                  <TabsTrigger value="run" className="flex-1">
                    Run
                  </TabsTrigger>
                </TabsList>

                {activeTab === "build" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMetadataDialogOpen(true)}
                    className="gap-2 h-9"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Workflow
                  </Button>
                )}
              </div>

              <TabsContent value="build" className="flex-1 mt-0 overflow-hidden">
                {activeTab === "build" && (
                  <div className="h-full flex flex-col">
                    {/* Header with workflow info */}
                    <div className="flex flex-col gap-1 px-4 py-2">
                      <h3 className="text-sm font-medium">{selectedWorkflow.name}</h3>
                      {selectedWorkflow.description && (
                        <p className="text-xs text-muted-foreground">{selectedWorkflow.description}</p>
                      )}
                    </div>

                    {/* Canvas or Empty State */}
                    <div className="relative flex-1 overflow-hidden">
                      {selectedWorkflow.steps.length === 0 ? (
                        /* Empty state - not part of canvas */
                        <div className="flex items-center justify-center h-full">
                          <div className="max-w-[280px]">
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-4 bg-background">
                              <p className="text-sm text-muted-foreground">
                                No steps yet. Add an agent to get started.
                              </p>
                              <AgentSelectorPopover agents={agents} onSelect={handleAddFirstStep} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Zoomable canvas container */}
                          <div
                            ref={containerRef}
                            className={cn("absolute inset-0 overflow-auto cursor-grab", isPanning && "cursor-grabbing")}
                            onMouseDown={handleMouseDown}
                            data-canvas-container
                          >
                            {/* Canvas content with zoom and pan transforms */}
                            <div className="absolute inset-0" style={canvasTransformStyle}>
                              <div className="py-8 px-4 min-h-full" data-canvas-content>
                                {/* Workflow steps */}
                                {renderWorkflowSteps()}
                              </div>
                            </div>
                          </div>

                          {/* Zoom controls - only show when there are steps */}
                          <CanvasZoomControls
                            zoom={zoom}
                            onZoomIn={zoomIn}
                            onZoomOut={zoomOut}
                            onToggleExpandAll={() => setAreAllStepsExpanded(!areAllStepsExpanded)}
                            areAllExpanded={areAllStepsExpanded}
                            minZoom={0.25}
                            maxZoom={2}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="run" className="flex-1 mt-0 overflow-hidden">
                <div className="h-full bg-background">{/* Run tab content - blank for now */}</div>
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
      <AlertDialog open={!!workflowToDelete} onOpenChange={(open) => !open && setWorkflowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-destructive" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workflow "{workflowToDelete?.name}" and
              remove it from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteWorkflow}
              className="hover:cursor-pointer bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
            >
              Yes, delete workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})
