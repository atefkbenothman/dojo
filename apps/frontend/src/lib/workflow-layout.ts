import { Node, Edge, Position } from 'reactflow'
import { WorkflowNode } from '@dojo/db/convex/types'
import { buildTreeForLayout, TreeNode } from './workflow-reactflow-transform'

// Extended TreeNode that can represent instructions node
interface ExtendedTreeNode extends TreeNode {
  isInstructionsNode?: boolean
}

export interface LayoutConfig {
  nodeWidth: number
  nodeHeight: number
  horizontalSpacing: number
  verticalSpacing: number
  direction: 'TB' | 'LR' // Top-to-Bottom or Left-to-Right
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeWidth: 280,
  nodeHeight: 140, // Slightly taller for better proportions
  horizontalSpacing: 120, // More space between siblings
  verticalSpacing: 80, // Less vertical space, more compact
  direction: 'TB'
}

interface NodePosition {
  nodeId: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * Simple hierarchical layout algorithm
 * Positions nodes in a tree structure from top to bottom
 */

/**
 * Create a virtual tree node for instructions that contains all root workflow nodes as children
 */
function createInstructionsTreeNode(workflowNodes: WorkflowNode[], config: LayoutConfig): ExtendedTreeNode {
  const { rootNodes } = buildTreeForLayout(workflowNodes)
  
  // Create virtual instructions node - doesn't need to match WorkflowNode exactly since it's virtual
  const instructionsNode: ExtendedTreeNode = {
    _id: 'instructions-root' as any,
    _creationTime: 0,
    workflowId: '' as any,
    nodeId: 'instructions-root',
    type: 'step' as const,
    agentId: undefined,
    parentNodeId: undefined,
    label: undefined,
    order: undefined,
    isInstructionsNode: true,
    children: rootNodes // All root workflow nodes become children of instructions
  }
  
  return instructionsNode
}

export function calculateHierarchicalLayout<T>(
  nodes: Node<T>[],
  edges: Edge[],
  workflowNodes: WorkflowNode[],
  config: Partial<LayoutConfig> = {}
): { nodes: Node<T>[], edges: Edge[] } {
  const layoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config }
  const positions = new Map<string, NodePosition>()
  
  // Check if we have an instructions node
  const hasInstructionsNode = nodes.some(node => node.id === 'instructions-root')
  
  if (hasInstructionsNode) {
    // Create a virtual tree with instructions as the root
    const instructionsTreeNode = createInstructionsTreeNode(workflowNodes, layoutConfig)
    const treeLayout = layoutTreeWithBounds(instructionsTreeNode, layoutConfig, 0)
    
    // Apply all positions from the unified tree layout
    treeLayout.positions.forEach((pos, nodeId) => positions.set(nodeId, pos))
  } else {
    // No instructions node, use standard layout
    const { rootNodes } = buildTreeForLayout(workflowNodes)
    let globalOffset = 0

    rootNodes.forEach(rootNode => {
      const treeLayout = layoutTreeWithBounds(rootNode, layoutConfig, globalOffset)
      treeLayout.positions.forEach((pos, nodeId) => positions.set(nodeId, pos))
      
      globalOffset = treeLayout.bounds.maxX + layoutConfig.horizontalSpacing * 2
    })
  }

  // Apply positions to nodes
  const layoutedNodes = nodes.map(node => ({
    ...node,
    position: {
      x: positions.get(node.id)?.x || 0,
      y: positions.get(node.id)?.y || 0
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  }))

  return { nodes: layoutedNodes, edges }
}

interface SubtreeLayout {
  positions: Map<string, NodePosition>
  bounds: { minX: number, maxX: number, width: number }
}


/**
 * Layout tree and return both positions and bounds
 */
function layoutTreeWithBounds(
  node: ExtendedTreeNode,
  config: LayoutConfig,
  offsetX: number = 0,
  level: number = 0
): SubtreeLayout {
  const positions = new Map<string, NodePosition>()
  
  // Use different dimensions for instructions node
  const nodeWidth = node.isInstructionsNode ? 320 : config.nodeWidth
  const nodeHeight = node.isInstructionsNode ? 180 : config.nodeHeight
  const nodeY = level * (config.nodeHeight + config.verticalSpacing)
  
  if (node.children.length === 0) {
    // Leaf node - simple case
    const nodeX = offsetX
    positions.set(node.nodeId, {
      nodeId: node.nodeId,
      x: nodeX,
      y: nodeY,
      width: nodeWidth,
      height: nodeHeight
    })
    
    return {
      positions,
      bounds: {
        minX: nodeX,
        maxX: nodeX + nodeWidth,
        width: nodeWidth
      }
    }
  }
  
  // Layout all children first (bottom-up)
  const childLayouts: SubtreeLayout[] = []
  let currentX = offsetX
  
  node.children.forEach(child => {
    const childLayout = layoutTreeWithBounds(child as ExtendedTreeNode, config, currentX, level + 1)
    childLayouts.push(childLayout)
    
    // Add child positions to our map
    childLayout.positions.forEach((pos, nodeId) => positions.set(nodeId, pos))
    
    // Move to next child position
    currentX = childLayout.bounds.maxX + config.horizontalSpacing
  })
  
  // Calculate bounds of all children
  const childrenMinX = Math.min(...childLayouts.map(c => c.bounds.minX))
  const childrenMaxX = Math.max(...childLayouts.map(c => c.bounds.maxX))
  const childrenWidth = childrenMaxX - childrenMinX
  
  // Position this node centered above children
  const nodeX = childrenMinX + (childrenWidth - nodeWidth) / 2
  
  positions.set(node.nodeId, {
    nodeId: node.nodeId,
    x: nodeX,
    y: nodeY,
    width: nodeWidth,
    height: nodeHeight
  })
  
  // Calculate final bounds (node might extend beyond children)
  const finalMinX = Math.min(nodeX, childrenMinX)
  const finalMaxX = Math.max(nodeX + nodeWidth, childrenMaxX)
  
  return {
    positions,
    bounds: {
      minX: finalMinX,
      maxX: finalMaxX,
      width: finalMaxX - finalMinX
    }
  }
}

/**
 * Calculate the bounds of a set of positioned nodes
 */
export function calculateBounds(positions: NodePosition[]): { width: number, height: number } {
  if (positions.length === 0) return { width: 0, height: 0 }
  
  const minX = Math.min(...positions.map(p => p.x))
  const maxX = Math.max(...positions.map(p => p.x + p.width))
  const minY = Math.min(...positions.map(p => p.y))
  const maxY = Math.max(...positions.map(p => p.y + p.height))
  
  return {
    width: maxX - minX,
    height: maxY - minY
  }
}