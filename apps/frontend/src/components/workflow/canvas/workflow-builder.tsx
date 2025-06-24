"use client"

import { Button } from "@/components/ui/button"
import { AddStepButton } from "@/components/workflow/add-step-button"
import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import { CanvasZoomControls } from "@/components/workflow/canvas/canvas-zoom-controls"
import { WorkflowStep } from "@/components/workflow/canvas/workflow-step"
import { useCanvasZoom } from "@/hooks/use-canvas-zoom"
import { useDragAndDrop } from "@/hooks/use-drag-and-drop"
import { cn } from "@/lib/utils"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, Agent } from "@dojo/db/convex/types"
import { Edit } from "lucide-react"
import { useCallback, useState, memo } from "react"

interface WorkflowBuilderProps {
  workflow: Workflow
  agents: Agent[]
  isAuthenticated: boolean
  workflowExecutions: Map<Id<"workflows">, any>
  getModel: (modelId: string) => { name: string } | undefined
  onEditMetadata: () => void
  onAddFirstStep: (agent: Agent) => void
  onAddStepAtIndex: (index: number, agent: Agent) => void
  onRemoveStep: (index: number) => void
  onDuplicateStep: (index: number, stepId: Id<"agents">) => void
  onConfigureStep: (index: number) => void
  onUpdateSteps: (newSteps: Id<"agents">[]) => void
  onViewLogs: () => void
}

export const WorkflowBuilder = memo(function WorkflowBuilder({
  workflow,
  agents,
  isAuthenticated,
  workflowExecutions,
  getModel,
  onEditMetadata,
  onAddFirstStep,
  onAddStepAtIndex,
  onRemoveStep,
  onDuplicateStep,
  onConfigureStep,
  onUpdateSteps,
  onViewLogs,
}: WorkflowBuilderProps) {
  // Local state for expand/collapse
  const [areAllStepsExpanded, setAreAllStepsExpanded] = useState(false)

  // Set up drag and drop
  const { draggedIndex, dragOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop } =
    useDragAndDrop({
      items: workflow.steps,
      onReorder: onUpdateSteps,
    })

  // Set up canvas zoom
  const { zoom, pan, isPanning, containerRef, handleMouseDown, zoomIn, zoomOut } = useCanvasZoom({
    minZoom: 0.25,
    maxZoom: 2,
    zoomStep: 0.1,
  })

  // Stable add step handler for end of workflow
  const handleAddAtEnd = useCallback(
    (agent: Agent) => {
      if (workflow.steps.length > 0) {
        onAddStepAtIndex(workflow.steps.length - 1, agent)
      }
    },
    [workflow.steps.length, onAddStepAtIndex],
  )

  // Get execution data for this workflow
  const execution = workflowExecutions.get(workflow._id)

  // Canvas transform style
  const canvasTransformStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: "0 0",
    transition: isPanning ? "none" : "transform 0.05s ease-out",
    willChange: isPanning ? "transform" : "auto",
  }

  // Render workflow steps
  const renderWorkflowSteps = () => {
    return (
      <div className="relative">
        {workflow.steps.map((stepId, index) => {
          const agent = agents.find((a) => a._id === stepId)
          if (!agent) return null

          // Calculate execution state for this step
          const getStepExecutionStatus = () => {
            if (!execution) return undefined

            if (!execution.stepExecutions) {
              if (execution.currentStep === undefined) return "pending"
              if (index < execution.currentStep) return "completed"
              if (index === execution.currentStep) {
                return execution.status === "running" ? "running" : "pending"
              }
              return "pending"
            }

            const stepExecution = execution.stepExecutions.find((se: any) => se.stepIndex === index)
            return stepExecution?.status || "pending"
          }

          const getStepDuration = () => {
            if (!execution?.stepExecutions) return undefined

            const stepExecution = execution.stepExecutions.find((se: any) => se.stepIndex === index)
            if (!stepExecution?.startedAt) return undefined

            const endTime = stepExecution.completedAt || Date.now()
            return endTime - stepExecution.startedAt
          }

          const getStepError = () => {
            if (!execution?.stepExecutions) return undefined
            const stepExecution = execution.stepExecutions.find((se: any) => se.stepIndex === index)
            return stepExecution?.error
          }

          const executionStatus = getStepExecutionStatus()
          // Only show current step indicator if workflow is still running
          const isCurrentStep = execution?.currentStep === index && execution?.status === "running"
          const executionDuration = getStepDuration()
          const executionError = getStepError()

          return (
            <div key={`${index}-${stepId}`} className="relative">
              <WorkflowStep
                step={agent}
                stepNumber={index + 1}
                modelName={getModel(agent.aiModelId)?.name}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onRemove={() => onRemoveStep(index)}
                onEdit={() => onConfigureStep(index)}
                onDuplicate={() => onDuplicateStep(index, stepId)}
                onViewLogs={onViewLogs}
                isExpanded={areAllStepsExpanded}
                executionStatus={executionStatus as "pending" | "connecting" | "running" | "completed" | "failed" | undefined}
                isCurrentStep={isCurrentStep}
                executionDuration={executionDuration}
                executionError={executionError}
              />

              {/* Add connecting line between steps - with execution state styling */}
              {index < workflow.steps.length - 1 && (
                <div className="relative py-4 w-[280px] mx-auto">
                  <div
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 transition-colors",
                      executionStatus === "completed" ? "bg-green-300" : "bg-border",
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* Single Add Step button at the end */}
        {workflow.steps.length > 0 && <AddStepButton agents={agents} onSelect={handleAddAtEnd} />}
      </div>
    )
  }

  return (
    <div className="h-full bg-transparent">
      {/* Canvas or Empty State */}
      <div className="relative h-full overflow-hidden">
        {workflow.steps.length === 0 ? (
          /* Empty state - not part of canvas */
          <div className="flex items-center justify-center h-full">
            <div className="max-w-[280px]">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-4 bg-background">
                <p className="text-sm text-muted-foreground">No steps yet. Add an agent to get started.</p>
                <AgentSelectorPopover agents={agents} onSelect={onAddFirstStep} />
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
              {/* Dot pattern background */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(circle, rgb(0 0 0 / 0.08) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: `${pan.x % 20}px ${pan.y % 20}px`,
                }}
              />
              <div
                className="absolute inset-0 dark:block hidden"
                style={{
                  backgroundImage: "radial-gradient(circle, rgb(255 255 255 / 0.08) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: `${pan.x % 20}px ${pan.y % 20}px`,
                }}
              />

              {/* Canvas content with zoom and pan transforms */}
              <div className="absolute inset-0" style={canvasTransformStyle}>
                <div className="py-8 px-4 min-h-full" data-canvas-content>
                  {/* Workflow steps */}
                  {renderWorkflowSteps()}
                </div>
              </div>
            </div>

            {/* Header and controls positioned on canvas */}
            <div className="absolute top-4 left-4 right-4 z-10 space-y-3">
              {/* Edit button */}
              <div className="flex items-center justify-end">
                <Button variant="outline" size="sm" onClick={onEditMetadata} className="gap-2 h-9">
                  <Edit className="h-3.5 w-3.5" />
                  Edit Workflow
                </Button>
              </div>

              {/* Header with workflow info */}
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium">{workflow.name}</h3>
                {workflow.description && <p className="text-xs text-muted-foreground">{workflow.description}</p>}
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
  )
})
