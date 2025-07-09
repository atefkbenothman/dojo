"use client"

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
  ViewportPortal,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCallback, useState, memo, useMemo, useEffect, useRef } from "react"

interface ReactFlowWorkflowCanvasProps {
  workflow: Workflow
  agents: Agent[]
  workflowNodes: WorkflowNode[]
  workflowExecutions: WorkflowExecution[]
  getModel: (modelId: string) => { name: string } | undefined
  getMcpServer: (serverId: string) => { name: string } | undefined
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

// Node Status Indicator Component
interface NodeStatusIndicatorProps {
  nodeId: string
  position: { x: number; y: number }
  height: number
  executionStatus?: string
}

const NodeStatusIndicator = memo(function NodeStatusIndicator({
  position,
  height,
  executionStatus,
}: NodeStatusIndicatorProps) {
  if (!executionStatus) return null

  const getStatusConfig = () => {
    switch (executionStatus) {
      case "connecting":
        return {
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/20",
          borderColor: "border-yellow-500/40",
          content: "connecting",
          isText: true,
        }
      case "running":
        return {
          color: "text-blue-500",
          bgColor: "bg-blue-500/20",
          borderColor: "border-blue-500/40",
          content: "running",
          isText: true,
        }
      case "completed":
        return {
          color: "text-green-500",
          bgColor: "bg-green-500/20",
          borderColor: "border-green-500/40",
          content: "✓",
          isText: false,
        }
      case "failed":
        return {
          color: "text-red-500",
          bgColor: "bg-red-500/20",
          borderColor: "border-red-500/40",
          content: "✗",
          isText: false,
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config) return null

  // Position to the left of the node with some offset and vertically centered
  const indicatorPosition = {
    x: position.x - (config.isText ? 80 : 60), // More space for text
    y: position.y + height / 2 - (config.isText ? 12 : 20), // Adjusted for text height
  }

  return (
    <div
      style={{
        position: "absolute",
        left: indicatorPosition.x,
        top: indicatorPosition.y,
        zIndex: 1000,
      }}
      className={cn(
        "border-2 flex items-center justify-center transition-all duration-300",
        "backdrop-blur-sm font-medium text-xs",
        config.bgColor,
        config.borderColor,
        config.color,
        config.isText ? "px-2 py-1 rounded-md min-w-[70px] h-6" : "w-10 h-10 rounded-full font-bold text-sm",
      )}
    >
      {config.content}
    </div>
  )
})

// Separate the inner component that uses React Flow hooks
const ReactFlowWorkflowCanvasInner = memo(function ReactFlowWorkflowCanvasInner({
  workflow,
  agents,
  workflowNodes,
  workflowExecutions,
  getModel,
  getMcpServer,
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
      return 260 // Instructions node fixed height - increased to match new structure
    }
    // Always use expanded height since we removed the collapse functionality
    return 260 // Updated to match current step node height
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
      getMcpServer,
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
  }, [
    workflowNodes,
    agents,
    workflow.instructions,
    onEditMetadata,
    handleAddFirstStep,
    getModel,
    getMcpServer,
    getNodeHeight,
  ])

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
          getMcpServer,
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
    getMcpServer,
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

          {/* Node Status Indicators using ViewportPortal */}
          {enhancedNodes.map((node) => {
            const executionStatus = getNodeExecutionStatus(node.id)
            if (!executionStatus) return null

            return (
              <ViewportPortal key={`status-${node.id}`}>
                <NodeStatusIndicator
                  nodeId={node.id}
                  position={node.position}
                  height={node.height || 260}
                  executionStatus={executionStatus}
                />
              </ViewportPortal>
            )
          })}
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
