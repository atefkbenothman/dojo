import dagre from "dagre"
import { Node, Edge, Position } from "reactflow"

export interface DagreLayoutConfig {
  nodeWidth: number
  nodeHeight: number
  horizontalSpacing: number
  verticalSpacing: number
  direction: "TB" | "BT" | "LR" | "RL"
}

const DEFAULT_DAGRE_CONFIG: DagreLayoutConfig = {
  nodeWidth: 280,
  nodeHeight: 260,
  horizontalSpacing: 120,
  verticalSpacing: 80,
  direction: "TB",
}

/**
 * Calculate layout using dagre algorithm
 * This replaces the custom hierarchical layout with a more robust solution
 */
export function calculateDagreLayout<T>(
  nodes: Node<T>[],
  edges: Edge[],
  config: Partial<DagreLayoutConfig> = {},
): { nodes: Node<T>[]; edges: Edge[] } {
  const layoutConfig = { ...DEFAULT_DAGRE_CONFIG, ...config }

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  // Set graph configuration
  dagreGraph.setGraph({
    rankdir: layoutConfig.direction,
    nodesep: layoutConfig.horizontalSpacing,
    ranksep: layoutConfig.verticalSpacing,
    ranker: "network-simplex", // Better layout algorithm
  })

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.width || layoutConfig.nodeWidth,
      height: node.height || layoutConfig.nodeHeight,
    })
  })

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Calculate the layout
  dagre.layout(dagreGraph)

  // Apply the calculated positions back to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)

    // Dagre gives us center positions, we need top-left
    const position = {
      x: nodeWithPosition.x - nodeWithPosition.width / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    }

    return {
      ...node,
      position,
      // Set source and target positions for better edge routing
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }
  })

  // Return layouted nodes and edges
  // Edges don't need position updates, ReactFlow handles that
  return {
    nodes: layoutedNodes,
    edges,
  }
}

/**
 * Helper to get graph bounds for fitView
 */
export function getLayoutBounds(nodes: Node[]): { x: number; y: number; width: number; height: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  nodes.forEach((node) => {
    const nodeWidth = node.width || DEFAULT_DAGRE_CONFIG.nodeWidth
    const nodeHeight = node.height || DEFAULT_DAGRE_CONFIG.nodeHeight

    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + nodeWidth)
    maxY = Math.max(maxY, node.position.y + nodeHeight)
  })

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Calculate the initial viewport to center the workflow
 * This prevents flicker by providing the correct viewport from the start
 */
export function calculateInitialViewport(
  nodes: Node[],
  containerWidth: number = 800,
  containerHeight: number = 600,
  padding: number = 0.3,
): { x: number; y: number; zoom: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0, zoom: 1 }
  }

  const bounds = getLayoutBounds(nodes)

  // Calculate zoom to fit content with padding
  const zoomX = containerWidth / (bounds.width * (1 + padding))
  const zoomY = containerHeight / (bounds.height * (1 + padding))
  const zoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.25), 2) // Between 0.25 and 2 to match ReactFlow

  // Calculate center position
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2

  // Calculate viewport position to center the content
  const x = containerWidth / 2 - centerX * zoom
  const y = containerHeight / 2 - centerY * zoom

  return { x, y, zoom }
}

/**
 * Create a layout specifically optimized for workflow trees
 * This is a convenience wrapper that sets good defaults for workflow layouts
 */
export function calculateWorkflowLayout<T>(
  nodes: Node<T>[],
  edges: Edge[],
  config: Partial<DagreLayoutConfig> = {},
): { nodes: Node<T>[]; edges: Edge[] } {
  // Set workflow-specific defaults
  const workflowConfig: Partial<DagreLayoutConfig> = {
    direction: "TB",
    nodeWidth: 280,
    nodeHeight: 260,
    horizontalSpacing: 100, // Slightly less than before for more compact layout
    verticalSpacing: 80,
    ...config,
  }

  return calculateDagreLayout(nodes, edges, workflowConfig)
}
