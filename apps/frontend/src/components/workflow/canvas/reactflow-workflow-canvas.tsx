"use client"

import { Button } from "@/components/ui/button"
import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import { CustomReactFlowControls } from "@/components/workflow/canvas/custom-reactflow-controls"
import { InstructionsNode } from "@/components/workflow/canvas/instructions-node"
import { StepNode } from "@/components/workflow/canvas/step-node"
import { useStableExecutionStatus } from "@/hooks/use-stable-execution-status"
import { cn } from "@/lib/utils"
import { calculateWorkflowLayout, calculateInitialViewport } from "@/lib/workflow-dagre-layout"
import { transformToReactFlow } from "@/lib/workflow-reactflow-transform"
import { Workflow, Agent, WorkflowExecution, WorkflowNode } from "@dojo/db/convex/types"
import {
  ReactFlow,
  Background,
  ConnectionMode,
  Panel,
  ReactFlowProvider,
  NodeTypes,
  Viewport,
  MarkerType,
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Plus } from "lucide-react"
import { useCallback, useState, memo, useMemo, useEffect, useRef } from "react"

interface ReactFlowWorkflowCanvasProps {
  workflow: Workflow
  agents: Agent[]
  workflowNodes: WorkflowNode[]
  workflowExecutions: WorkflowExecution[]
  getModel: (modelId: string) => { name: string } | undefined
  onEditMetadata?: () => void
  isVisible?: boolean
  // Node handlers
  onRemoveNode?: (nodeId: string) => void
  onChangeNodeAgent?: (nodeId: string, agent: Agent) => void
  onEditAgent?: (agent: Agent) => void
  onAddStepWithAgent?: (parentNodeId: string, agent: Agent) => void
  onAddFirstStep?: (agent: Agent) => void
}

const nodeTypes: NodeTypes = {
  instructionsNode: InstructionsNode,
  stepNode: StepNode,
}

// Define stable fitView options
const fitViewOptions = {
  padding: 0.3,
  includeHiddenNodes: false,
}

// Define default viewport
const defaultViewport = { x: 0, y: 0, zoom: 1 }

// Separate the inner component that uses React Flow hooks
const ReactFlowWorkflowCanvasInner = memo(function ReactFlowWorkflowCanvasInner({
  workflow,
  agents,
  workflowNodes,
  workflowExecutions,
  getModel,
  onEditMetadata,
  isVisible,
  onRemoveNode,
  onChangeNodeAgent,
  onEditAgent,
  onAddStepWithAgent,
  onAddFirstStep,
}: ReactFlowWorkflowCanvasProps) {
  const { fitView } = useReactFlow()
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)
  const wasVisibleRef = useRef(false) // Initialize to false to catch first visibility

  // Get execution data for this workflow
  const execution = useMemo(() => {
    const workflowExecs = workflowExecutions
      .filter((exec) => exec.workflowId === workflow._id)
      .sort((a, b) => b.startedAt - a.startedAt)
    return workflowExecs[0] || undefined
  }, [workflowExecutions, workflow._id])

  // Use stable execution status hook
  const { getNodeExecutionStatus } = useStableExecutionStatus(execution)

  // Calculate node heights
  const getNodeHeight = useCallback((nodeId: string, isInstructionsNode: boolean = false) => {
    if (isInstructionsNode) {
      return 180 // Instructions node fixed height
    }
    // Always use expanded height since we removed the collapse functionality
    return 240
  }, [])

  // Stable callback for adding first step
  const handleAddFirstStep = useCallback(
    (agent: Agent) => {
      onAddFirstStep?.(agent)
    },
    [onAddFirstStep],
  )

  // Create stable references for the callbacks to prevent re-renders
  const stableOnRemove = useCallback(
    (nodeId: string) => {
      onRemoveNode?.(nodeId)
    },
    [onRemoveNode],
  )

  const stableOnChangeAgent = useCallback(
    (nodeId: string, agent: Agent) => {
      onChangeNodeAgent?.(nodeId, agent)
    },
    [onChangeNodeAgent],
  )

  const stableOnAddStepWithAgent = useCallback(
    (parentNodeId: string, agent: Agent) => {
      onAddStepWithAgent?.(parentNodeId, agent)
    },
    [onAddStepWithAgent],
  )

  const stableOnEditAgent = useCallback(
    (agent: Agent) => {
      onEditAgent?.(agent)
    },
    [onEditAgent],
  )

  // Transform workflow data to ReactFlow format (without execution status)
  const { nodes: transformedNodes, edges: transformedEdges } = useMemo(() => {
    const result = transformToReactFlow({
      workflowNodes: workflowNodes || [],
      agents,
      instructions: workflow.instructions,
      onEditInstructions: onEditMetadata,
      onAddStepToInstructions: handleAddFirstStep,
      getModel,
    })

    // Update node heights based on expanded state and fix width/height types
    return {
      ...result,
      nodes: result.nodes.map((node) => ({
        ...node,
        width: node.width || undefined, // Convert null to undefined
        height: getNodeHeight(node.id, node.data.variant === "instructions"),
      })),
    }
  }, [workflowNodes, agents, workflow.instructions, onEditMetadata, handleAddFirstStep, getModel, getNodeHeight])

  // Apply layout algorithm
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    const result = calculateWorkflowLayout(transformedNodes, transformedEdges, {
      horizontalSpacing: 120,
      verticalSpacing: 80,
      direction: "TB",
    })

    return result
  }, [transformedNodes, transformedEdges])

  // Apply execution status and handlers to nodes
  const enhancedNodes = useMemo(() => {
    return layoutedNodes.map((node) => {
      const executionStatus = getNodeExecutionStatus(node.id)

      return {
        ...node,
        width: node.width || undefined, // Convert null to undefined
        height: node.height || undefined, // Convert null to undefined
        selected: selectedNodes.includes(node.id),
        data: {
          ...node.data,
          executionStatus,
          onRemove: stableOnRemove,
          onChangeAgent: stableOnChangeAgent,
          onEditAgent: stableOnEditAgent,
          onAddStepWithAgent: stableOnAddStepWithAgent,
          agents,
          getModel,
        },
      }
    })
  }, [
    layoutedNodes,
    stableOnRemove,
    stableOnChangeAgent,
    stableOnEditAgent,
    stableOnAddStepWithAgent,
    agents,
    getModel,
    getNodeExecutionStatus,
    selectedNodes,
  ])

  // Apply execution status styling to edges
  const styledEdges = useMemo(() => {
    return layoutedEdges.map((edge) => {
      const parentStatus = getNodeExecutionStatus(edge.source)
      const childStatus = getNodeExecutionStatus(edge.target)

      // Dynamic styling based on execution state
      let strokeColor = "#64748b" // default slate-500
      let strokeWidth = 2
      let isAnimated = false

      if (parentStatus === "completed" && childStatus === "running") {
        strokeColor = "#3b82f6" // blue-500 for active flow
        strokeWidth = 3
        isAnimated = true
      } else if (parentStatus === "completed") {
        strokeColor = "#10b981" // green-500 for completed
        strokeWidth = 2
      } else if (parentStatus === "failed") {
        strokeColor = "#ef4444" // red-500 for failed
        strokeWidth = 2
      }

      return {
        ...edge,
        type: "step", // Use step edge for sharp corners
        animated: isAnimated,
        style: {
          ...edge.style,
          stroke: strokeColor,
          strokeWidth,
        },
        markerEnd:
          edge.markerEnd && typeof edge.markerEnd === "object"
            ? {
                ...edge.markerEnd,
                color: strokeColor,
              }
            : {
                type: MarkerType.ArrowClosed,
                color: strokeColor,
              },
      }
    })
  }, [layoutedEdges, getNodeExecutionStatus])

  // Calculate initial viewport for workflow centering
  const initialViewport = useMemo((): Viewport => {
    if (enhancedNodes.length === 0) {
      return defaultViewport
    }

    return calculateInitialViewport(enhancedNodes, containerSize.width, containerSize.height, fitViewOptions.padding)
  }, [enhancedNodes, containerSize.width, containerSize.height])

  // Update container size when component mounts
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    // Set initial size
    updateContainerSize()

    // Listen for resize events
    window.addEventListener("resize", updateContainerSize)
    return () => window.removeEventListener("resize", updateContainerSize)
  }, [])

  // Handle tab visibility changes - re-center when becoming visible
  useEffect(() => {
    const wasVisible = wasVisibleRef.current

    // Check if we're transitioning from hidden to visible
    if (isVisible && !wasVisible && enhancedNodes.length > 0) {
      // Re-measure container size in case it changed while hidden
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
      fitView(fitViewOptions)
    }

    // Update the ref after processing
    wasVisibleRef.current = isVisible ?? false
  }, [isVisible, enhancedNodes.length, fitView])

  const hasWorkflowNodes = workflowNodes && workflowNodes.length > 0

  return (
    <div className="h-full" ref={containerRef}>
      {/* ReactFlow Canvas */}
      <div className="relative h-full">
        <ReactFlow
          nodes={enhancedNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitViewOptions={fitViewOptions}
          minZoom={0.25}
          maxZoom={2}
          defaultViewport={initialViewport}
          key={`${workflow._id}-${enhancedNodes.length}`} // Force re-render with new viewport
          nodesDraggable={false} // Keep disabled for structured layout
          nodesConnectable={false} // Disable connection creation for now
          elementsSelectable={true} // Enable selection
          panOnScroll={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnDrag={true}
          selectNodesOnDrag={false}
          selectionOnDrag={true}
          className="bg-background"
          // v12 Performance optimizations
          onlyRenderVisibleElements={true} // Only render nodes/edges in viewport
          nodeDragThreshold={2} // Prevent accidental drags
          disableKeyboardA11y={false} // Keep accessibility features
          autoPanOnNodeDrag={true} // Auto-pan when dragging nodes near edges
          // Additional optimizations
          connectOnClick={false} // Prevent accidental connections
          snapToGrid={false} // Could enable with snapGrid={[15, 15]} for grid snapping
          deleteKeyCode={null} // Disable delete key handling
          panActivationKeyCode="Space" // Hold space to pan
          // Hide ReactFlow attribution
          proOptions={{ hideAttribution: true }}
          onNodeClick={(event, node) => {
            if (event.shiftKey) {
              // Multi-select with shift key
              setSelectedNodes((prev) =>
                prev.includes(node.id) ? prev.filter((id) => id !== node.id) : [...prev, node.id],
              )
            } else {
              // Single select
              setSelectedNodes([node.id])
            }
          }}
          onPaneClick={() => {
            // Deselect all when clicking on background
            setSelectedNodes([])
          }}
        >
          <Background color="hsl(var(--muted-foreground))" gap={24} size={1} style={{ opacity: 0.08 }} />
          <Panel position="bottom-left">
            <CustomReactFlowControls minZoom={0.25} maxZoom={2} className="bg-background/95" />
          </Panel>
          <Panel position="top-left">
            <div className="bg-background/95 backdrop-blur border text-sm text-muted-foreground flex items-center h-12 px-4">
              {(workflowNodes || []).length} {(workflowNodes || []).length === 1 ? "step" : "steps"}
            </div>
          </Panel>

          {/* Show empty state panel when no workflow steps */}
          {!hasWorkflowNodes && (
            <Panel position="bottom-center" className="m-8">
              <div className="text-center space-y-6 p-6 bg-background/95 backdrop-blur border border-border rounded-lg shadow-sm max-w-md">
                {/* Empty state illustration */}
                <div className="relative">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-2 border-dashed border-primary/20">
                    <Plus className="w-8 h-8 text-primary/60" />
                  </div>
                </div>

                {/* Empty state message */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Add Your First Step</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Connect AI agents to build intelligent workflows that process data and make decisions.
                  </p>
                </div>

                {/* Add first step button */}
                {agents && agents.length > 0 ? (
                  <AgentSelectorPopover
                    agents={agents}
                    onSelect={handleAddFirstStep}
                    getModel={getModel}
                    trigger={
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                        <Plus className="w-4 h-4" />
                        Add Step
                      </Button>
                    }
                  />
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-xs text-muted-foreground">No agents available. Create an agent first.</p>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* Control panels */}
          <Panel position="top-right" className="m-4 space-y-2">
            {/* Workflow status indicator */}
            {execution && (
              <div className="bg-background/95 backdrop-blur border border-border rounded-lg shadow-sm p-2 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      execution.status === "running" && "bg-blue-500 animate-pulse",
                      execution.status === "completed" && "bg-green-500",
                      execution.status === "failed" && "bg-red-500",
                      execution.status === "preparing" && "bg-yellow-500",
                    )}
                  />
                  <span className="capitalize text-foreground">{execution.status}</span>
                </div>
                {execution.status === "running" && execution.nodeExecutions && (
                  <div className="text-muted-foreground bg-red-300">
                    {execution.nodeExecutions.filter((ne) => ne.status === "completed").length} /{" "}
                    {execution.nodeExecutions.length} steps
                  </div>
                )}
              </div>
            )}
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
})

// Main component that provides the ReactFlowProvider
export const ReactFlowWorkflowCanvas = memo(function ReactFlowWorkflowCanvas(props: ReactFlowWorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowWorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
})
