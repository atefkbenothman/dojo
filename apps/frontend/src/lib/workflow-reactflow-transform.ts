import { WorkflowNode, Agent } from "@dojo/db/convex/types"
import { Node, Edge, MarkerType } from "reactflow"

export interface UnifiedNodeData {
  variant: "instructions" | "step"
  instructions?: string
  onEditClick?: () => void
  onAddStepToInstructions?: (agent: Agent) => void
  agents?: Agent[]
  getModel?: (modelId: string) => { name: string } | undefined
  getMcpServer?: (serverId: string) => { name: string } | undefined
  workflowNode?: WorkflowNode
  agent?: Agent
}

export interface TransformToReactFlowParams {
  workflowNodes: WorkflowNode[]
  agents: Agent[]
  instructions?: string
  onEditInstructions?: () => void
  onAddStepToInstructions?: (agent: Agent) => void
  getModel?: (modelId: string) => { name: string } | undefined
  getMcpServer?: (serverId: string) => { name: string } | undefined
}

export interface ReactFlowTransformResult {
  nodes: Node<UnifiedNodeData>[]
  edges: Edge[]
}

/**
 * Transform workflow nodes to ReactFlow format (without execution status)
 */
// Helper function to create consistent edges
function createWorkflowEdge(id: string, source: string, target: string): Edge {
  return {
    id,
    source,
    target,
    type: "step",
    style: {
      stroke: "#64748b",
      strokeWidth: 2,
      fill: "none",
      strokeDasharray: "none",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#64748b",
    },
  }
}

export function transformToReactFlow({
  workflowNodes,
  agents,
  instructions,
  onEditInstructions,
  onAddStepToInstructions,
  getModel,
  getMcpServer,
}: TransformToReactFlowParams): ReactFlowTransformResult {
  const nodes: Node<UnifiedNodeData>[] = []
  const edges: Edge[] = []

  // Always add instructions node as the root
  const instructionsNode: Node<UnifiedNodeData> = {
    id: "instructions-root",
    type: "instructionsNode",
    position: { x: 0, y: 0 }, // Will be set by layout algorithm
    width: 360, // Wider than step nodes for better content display
    height: 260,
    data: {
      variant: "instructions",
      instructions: instructions || "",
      onEditClick: onEditInstructions,
      onAddStepToInstructions,
      agents,
      getModel,
      getMcpServer,
    },
  }
  nodes.push(instructionsNode)

  // Transform workflow nodes
  const stepNodes: Node<UnifiedNodeData>[] = workflowNodes.map((workflowNode) => {
    const agent = workflowNode.agentId ? agents.find((a) => a._id === workflowNode.agentId) : undefined

    return {
      id: workflowNode.nodeId,
      type: "stepNode",
      position: { x: 0, y: 0 }, // Will be set by layout algorithm
      width: 280, // Default width for step nodes
      height: 260, // Default height for step nodes
      data: {
        variant: "step",
        workflowNode,
        agent,
        getMcpServer,
      },
    }
  })

  nodes.push(...stepNodes)

  // Create edges from instructions to root workflow nodes
  const rootWorkflowNodes = workflowNodes.filter((node) => !node.parentNodeId)
  rootWorkflowNodes.forEach((rootNode) => {
    edges.push(createWorkflowEdge(`instructions-root-${rootNode.nodeId}`, "instructions-root", rootNode.nodeId))
  })

  // Create edges between workflow nodes (parent-child relationships)
  workflowNodes
    .filter((node) => node.parentNodeId)
    .forEach((node) => {
      edges.push(createWorkflowEdge(`${node.parentNodeId}-${node.nodeId}`, node.parentNodeId!, node.nodeId))
    })

  return { nodes, edges }
}
