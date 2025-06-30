import { Node, Edge, MarkerType } from 'reactflow'
import { WorkflowNode, Agent } from '@dojo/db/convex/types'

export interface ReactFlowNodeData {
  workflowNode: WorkflowNode
  agent?: Agent
}

export interface TransformToReactFlowParams {
  workflowNodes: WorkflowNode[]
  agents: Agent[]
}

export interface ReactFlowTransformResult {
  nodes: Node<ReactFlowNodeData>[]
  edges: Edge[]
}

/**
 * Transform workflow nodes to ReactFlow format (without execution status)
 */
export function transformToReactFlow({
  workflowNodes,
  agents,
}: TransformToReactFlowParams): ReactFlowTransformResult {
  // Transform nodes
  const nodes: Node<ReactFlowNodeData>[] = workflowNodes.map(workflowNode => {
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

  // Create basic edges from parent-child relationships (styling applied later)
  const edges: Edge[] = workflowNodes
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