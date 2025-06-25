"use client"

import { AddStepButton } from "@/components/workflow/add-step-button"
import { CanvasZoomControls } from "@/components/workflow/canvas/canvas-zoom-controls"
import { WorkflowInstructionsStep } from "@/components/workflow/canvas/workflow-instructions-step"
import { WorkflowStep } from "@/components/workflow/canvas/workflow-step"
import { useCanvasZoom } from "@/hooks/use-canvas-zoom"
import { useDragAndDrop } from "@/hooks/use-drag-and-drop"
import { cn } from "@/lib/utils"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, Agent, WorkflowExecution } from "@dojo/db/convex/types"
import { useCallback, useState, memo } from "react"

interface WorkflowBuilderProps {
  workflow: Workflow
  agents: Agent[]
  isAuthenticated: boolean
  workflowExecutions: Map<Id<"workflows">, WorkflowExecution>
  getModel: (modelId: string) => { name: string } | undefined
  onAddFirstStep: (agent: Agent) => void
  onAddStepAtIndex: (index: number, agent: Agent) => void
  onRemoveStep: (index: number) => void
  onDuplicateStep: (index: number, stepId: Id<"agents">) => void
  onConfigureStep: (index: number) => void
  onUpdateSteps: (newSteps: Id<"agents">[]) => void
  onViewLogs: () => void
  onEditMetadata?: () => void
}

export const WorkflowBuilder = memo(function WorkflowBuilder({
  workflow,
  agents,
  workflowExecutions,
  getModel,
  onAddFirstStep,
  onAddStepAtIndex,
  onRemoveStep,
  onDuplicateStep,
  onConfigureStep,
  onUpdateSteps,
  onViewLogs,
  onEditMetadata,
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
      if (workflow.steps.length === 0) {
        // If no steps, add as first step
        onAddFirstStep(agent)
      } else {
        // Add after the last step (index = length - 1 will insert at position length)
        onAddStepAtIndex(workflow.steps.length - 1, agent)
      }
    },
    [workflow.steps.length, onAddFirstStep, onAddStepAtIndex],
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

  // Calculate execution state for a step
  const getStepExecutionStatus = useCallback(
    (index: number) => {
      if (!execution) return undefined

      if (!execution.stepExecutions) {
        if (execution.currentStep === undefined) return "pending"
        if (index < execution.currentStep) return "completed"
        if (index === execution.currentStep) {
          return execution.status === "running" ? "running" : "pending"
        }
        return "pending"
      }

      const stepExecution = execution.stepExecutions.find((se) => se.stepIndex === index)
      return stepExecution?.status || "pending"
    },
    [execution],
  )

  // Calculate step duration
  const getStepDuration = useCallback(
    (index: number) => {
      if (!execution?.stepExecutions) return undefined

      const stepExecution = execution.stepExecutions.find((se) => se.stepIndex === index)
      if (!stepExecution?.startedAt) return undefined

      const endTime = stepExecution.completedAt || Date.now()
      return endTime - stepExecution.startedAt
    },
    [execution],
  )

  // Get step error
  const getStepError = useCallback(
    (index: number) => {
      if (!execution?.stepExecutions) return undefined
      const stepExecution = execution.stepExecutions.find((se) => se.stepIndex === index)
      return stepExecution?.error
    },
    [execution],
  )

  // Render workflow steps
  const renderWorkflowSteps = () => {
    return (
      <div className="relative">
        {/* Instructions step - always shown first */}
        <>
          <WorkflowInstructionsStep
            instructions={workflow.instructions}
            isExpanded={areAllStepsExpanded}
            onEditClick={onEditMetadata}
          />
          {/* Connecting line from instructions to first step */}
          {workflow.steps.length > 0 && (
            <div className="relative py-4 w-[280px] mx-auto">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-border" />
            </div>
          )}
        </>

        {workflow.steps.map((stepId, index) => {
          const agent = agents.find((a) => a._id === stepId)
          if (!agent) return null

          const executionStatus = getStepExecutionStatus(index)
          // Only show current step indicator if workflow is still running
          const isCurrentStep = execution?.currentStep === index && execution?.status === "running"
          const executionDuration = getStepDuration(index)
          const executionError = getStepError(index)

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
                executionStatus={
                  executionStatus as "pending" | "connecting" | "running" | "completed" | "failed" | undefined
                }
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

        <AddStepButton agents={agents} onSelect={handleAddAtEnd} getModel={getModel} />
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Canvas or Empty State */}
      <div className="relative h-full overflow-hidden">
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
            <div className="flex flex-col items-center justify-center min-h-full py-16" data-canvas-content>
              {/* Workflow steps */}
              {renderWorkflowSteps()}
            </div>
          </div>
        </div>

        {/* Zoom controls - show when there are steps or instructions */}
        <CanvasZoomControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onToggleExpandAll={() => setAreAllStepsExpanded(!areAllStepsExpanded)}
          areAllExpanded={areAllStepsExpanded}
          minZoom={0.25}
          maxZoom={2}
        />
      </div>
    </div>
  )
})
