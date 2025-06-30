"use client"

import { Button } from "@/components/ui/button"
import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import { CanvasZoomControls } from "@/components/workflow/canvas/canvas-zoom-controls"
import { WorkflowInstructionsStep } from "@/components/workflow/canvas/workflow-instructions-step"
import { WorkflowTreeNode as WorkflowTreeNodeComponent } from "@/components/workflow/canvas/workflow-tree-node"
import { useCanvasZoom } from "@/hooks/use-canvas-zoom"
import { cn } from "@/lib/utils"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, Agent, WorkflowExecution, WorkflowNode, WorkflowTreeNode } from "@dojo/db/convex/types"
import { Plus } from "lucide-react"
import { useCallback, useState, memo } from "react"
import type { ReactElement } from "react"

interface WorkflowBuilderProps {
  workflow: Workflow
  agents: Agent[]
  workflowNodes: WorkflowNode[]
  isAuthenticated: boolean
  workflowExecutions: Map<Id<"workflows">, WorkflowExecution>
  getModel: (modelId: string) => { name: string } | undefined
  onEditMetadata?: () => void
  // Tree-specific handlers
  onRemoveNode?: (nodeId: string) => void
  onChangeNodeAgent?: (nodeId: string, agent: Agent) => void
  onAddStepWithAgent?: (parentNodeId: string, agent: Agent) => void
  onAddFirstStep?: (agent: Agent) => void
}

export const WorkflowBuilder = memo(function WorkflowBuilder({
  workflow,
  agents,
  workflowNodes,
  workflowExecutions,
  getModel,
  onAddFirstStep,
  onEditMetadata,
  onRemoveNode,
  onChangeNodeAgent,
  onAddStepWithAgent,
}: WorkflowBuilderProps) {
  // Local state for expand/collapse
  const [areAllStepsExpanded, setAreAllStepsExpanded] = useState(false)

  // Drag and drop not needed for tree-based workflows

  // Set up canvas zoom
  const { zoom, pan, isPanning, containerRef, handleMouseDown, zoomIn, zoomOut } = useCanvasZoom({
    minZoom: 0.25,
    maxZoom: 2,
    zoomStep: 0.1,
  })

  // Get execution data for this workflow
  const execution = workflowExecutions.get(workflow._id)

  // Canvas transform style
  const canvasTransformStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: "0 0",
    transition: isPanning ? "none" : "transform 0.05s ease-out",
    willChange: isPanning ? "transform" : "auto",
  }

  // Tree rendering functions
  const getNodeExecutionStatus = useCallback(
    (nodeId: string) => {
      if (!execution || !("nodeExecutions" in execution) || !execution.nodeExecutions) {
        return "pending"
      }
      const nodeExecution = execution.nodeExecutions.find((ne) => ne.nodeId === nodeId)
      return nodeExecution?.status || "pending"
    },
    [execution],
  )

  // Helper function to build tree structure maintaining parent-child relationships
  const buildTreeStructure = useCallback((nodes: WorkflowNode[]): WorkflowTreeNode[] => {
    const nodeMap = new Map<string, WorkflowTreeNode>(nodes.map((node) => [node.nodeId, { ...node, children: [] }]))
    const rootNodes: WorkflowTreeNode[] = []

    // Build the tree structure
    nodes.forEach((node) => {
      const treeNode = nodeMap.get(node.nodeId)!

      if (!node.parentNodeId) {
        // Root node
        rootNodes.push(treeNode)
      } else {
        // Child node - add to parent's children array
        const parent = nodeMap.get(node.parentNodeId)
        if (parent) {
          parent.children.push(treeNode)
        }
      }
    })

    return rootNodes
  }, [])

  // Recursive function to render a tree node and its children
  const renderTreeNode = useCallback(
    (treeNode: WorkflowTreeNode, level: number = 0): ReactElement => {
      const agent = treeNode.agentId ? agents.find((a) => a._id === treeNode.agentId) : undefined
      const hasChildren = treeNode.children && treeNode.children.length > 0

      return (
        <div key={treeNode.nodeId} className="flex flex-col">
          {/* The node itself - fixed width container for consistent alignment */}
          <div className="flex justify-center mb-4">
            <div className="w-[280px]">
              {" "}
              {/* Fixed width to match WorkflowTreeNode */}
              <WorkflowTreeNodeComponent
                node={treeNode}
                agent={agent}
                level={level}
                executionStatus={getNodeExecutionStatus(treeNode.nodeId)}
                onRemove={() => onRemoveNode?.(treeNode.nodeId)}
                onChangeAgent={(agent) => onChangeNodeAgent?.(treeNode.nodeId, agent)}
                onAddStepWithAgent={(agent) => onAddStepWithAgent?.(treeNode.nodeId, agent)}
                agents={agents}
                getModel={getModel}
              />
            </div>
          </div>

          {/* Children container - rendered directly below parent */}
          {hasChildren && (
            <div className="relative">
              {/* Step 1: Vertical line from parent center down to children area */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] h-6 bg-border" />

              {/* Step 2: Connection logic based on number of children */}
              {treeNode.children.length === 1 ? (
                /* Single child: Direct vertical line to child center */
                <div className="absolute left-1/2 -translate-x-1/2 top-6 w-[2px] h-8 bg-border" />
              ) : (
                /* Multiple children: Horizontal connector + vertical drops */
                <>
                  {/* Horizontal connector line spanning all children */}
                  <div
                    className="absolute top-6 h-[2px] bg-border"
                    style={{
                      left: `calc(50% - ${(treeNode.children.length - 1) * 32}px)`, // 64px gap / 2 = 32px
                      width: `${(treeNode.children.length - 1) * 64}px`, // 64px gap between children
                    }}
                  />
                  {/* Vertical drops to each child */}
                  {treeNode.children.map((child: WorkflowTreeNode, index: number) => {
                    const offsetFromCenter = (index - (treeNode.children.length - 1) / 2) * 64 // 64px = gap-16
                    return (
                      <div
                        key={`connector-${child.nodeId}`}
                        className="absolute w-[2px] h-8 bg-border"
                        style={{
                          left: `calc(50% + ${offsetFromCenter}px - 1px)`, // -1px to center the 2px line
                          top: "24px", // 6px + 2px line height
                        }}
                      />
                    )
                  })}
                </>
              )}

              {/* Children arranged horizontally with consistent spacing */}
              <div className="flex justify-center">
                <div className="flex items-start gap-16 relative">
                  {treeNode.children.map((child: WorkflowTreeNode) => (
                    <div key={child.nodeId} className="relative">
                      {/* Recursively render child node */}
                      <div className="pt-14">
                        {" "}
                        {/* Increased padding for connection lines */}
                        {renderTreeNode(child, level + 1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    },
    [agents, getNodeExecutionStatus, onRemoveNode, onChangeNodeAgent, onAddStepWithAgent, getModel],
  )

  const renderTreeNodes = useCallback(() => {
    if (!workflowNodes || workflowNodes.length === 0) {
      return (
        <div className="relative py-16 w-full flex flex-col items-center justify-center">
          <div className="text-center space-y-6">
            {/* Empty state icon */}
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>

            {/* Empty state message */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-foreground">Add your first step</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Get started by adding a step with an agent to begin building your workflow.
              </p>
            </div>

            {/* Add first step button */}
            {agents && agents.length > 0 ? (
              <AgentSelectorPopover
                agents={agents}
                onSelect={(agent) => onAddFirstStep?.(agent)}
                getModel={getModel}
                trigger={
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                    <Plus className="w-4 h-4" />
                    Add Step
                  </Button>
                }
              />
            ) : (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  No agents available. Create an agent first to add steps.
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    const treeRoots = buildTreeStructure(workflowNodes)

    return (
      <div className="flex justify-center items-start gap-24 py-8">
        {treeRoots.map((rootNode) => renderTreeNode(rootNode, 0))}
      </div>
    )
  }, [workflowNodes, buildTreeStructure, renderTreeNode, agents, onAddFirstStep, getModel])

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
          {/* Tree-based workflow visualization */}
          <div className="relative py-4">{renderTreeNodes()}</div>
        </>
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
