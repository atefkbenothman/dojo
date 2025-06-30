import { Node, Edge, MarkerType } from 'reactflow'
import { WorkflowNode, Agent } from '@dojo/db/convex/types'

export interface ReactFlowNodeData {
  workflowNode: WorkflowNode
  agent?: Agent
}

export interface InstructionsNodeData {
  instructions: string
  onEditClick?: () => void
}

export interface TransformToReactFlowParams {
  workflowNodes: WorkflowNode[]
  agents: Agent[]
  instructions?: string
  onEditInstructions?: () => void
}

export interface ReactFlowTransformResult {
  nodes: Node<ReactFlowNodeData | InstructionsNodeData>[]
  edges: Edge[]
}

/**
 * Transform workflow nodes to ReactFlow format (without execution status)
 */
export function transformToReactFlow({
  workflowNodes,
  agents,
  instructions,
  onEditInstructions,
}: TransformToReactFlowParams): ReactFlowTransformResult {
  const nodes: Node<ReactFlowNodeData | InstructionsNodeData>[] = []
  const edges: Edge[] = []

  // Always add instructions node as the root
  const instructionsNode: Node<InstructionsNodeData> = {
    id: 'instructions-root',
    type: 'instructionsNode',
    position: { x: 0, y: 0 }, // Will be set by layout algorithm
    data: {
      instructions: instructions || '',
      onEditClick: onEditInstructions,
    }
  }
  nodes.push(instructionsNode)

  // Transform workflow nodes
  const stepNodes: Node<ReactFlowNodeData>[] = workflowNodes.map(workflowNode => {
    const agent = workflowNode.agentId 
      ? agents.find(a => a._id === workflowNode.agentId)
      : undefined

    return {
      id: workflowNode.nodeId,
      type: 'stepNode',
      position: { x: 0, y: 0 }, // Will be set by layout algorithm
      data: {
        workflowNode,
        agent,
      }
    }
  })

  nodes.push(...stepNodes)

  // Create edges from instructions to root workflow nodes
  const rootWorkflowNodes = workflowNodes.filter(node => !node.parentNodeId)
  rootWorkflowNodes.forEach(rootNode => {
    edges.push({
      id: `instructions-root-${rootNode.nodeId}`,
      source: 'instructions-root',
      target: rootNode.nodeId,
      type: 'smoothstep',
      style: {
        stroke: '#64748b',
        strokeWidth: 2,
        fill: 'none',
        strokeDasharray: 'none'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b'
      }
    })
  })

  // Create edges between workflow nodes (parent-child relationships)
  const workflowEdges: Edge[] = workflowNodes
    .filter(node => node.parentNodeId)
    .map(node => ({
      id: `${node.parentNodeId}-${node.nodeId}`,
      source: node.parentNodeId!,
      target: node.nodeId,
      type: 'smoothstep',
      style: {
        stroke: '#64748b',
        strokeWidth: 2,
        fill: 'none',
        strokeDasharray: 'none'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b'
      }
    }))

  edges.push(...workflowEdges)

  return { nodes, edges }
}

export type TreeNode = WorkflowNode & { children: TreeNode[] }

/**
 * Build tree structure for layout algorithm
 */
export function buildTreeForLayout(workflowNodes: WorkflowNode[]) {
  const nodeMap = new Map<string, TreeNode>(
    workflowNodes.map(node => [node.nodeId, { ...node, children: [] }])
  )
  
  const rootNodes: TreeNode[] = []

  // Build the tree structure
  workflowNodes.forEach(node => {
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

  return { nodeMap, rootNodes }
}