"use client"

import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, WorkflowNode, Agent } from "@dojo/db/convex/types"
import { useMutation } from "convex/react"
import { useState, useCallback } from "react"

interface NodeToDelete {
  nodeId: string
  type: "step"
  label?: string
  agentId?: string
}

interface UseWorkflowNodesProps {
  selectedWorkflow: Workflow | null | undefined
  workflowNodes: WorkflowNode[]
  isAuthenticated: boolean
  onEditWorkflow: (params: {
    id: Id<"workflows">
    name: string
    description: string
    instructions: string
    rootNodeId?: string
    isPublic?: boolean
    userId?: Id<"users">
  }) => Promise<null>
}

export function useWorkflowNodes({
  selectedWorkflow,
  workflowNodes,
  isAuthenticated,
  onEditWorkflow,
}: UseWorkflowNodesProps) {
  // Node mutations
  const addNodeMutation = useMutation(api.workflows.addNode)
  const removeNodeMutation = useMutation(api.workflows.removeNode)
  const updateNodeMutation = useMutation(api.workflows.updateNode)

  // Node state
  const [nodeToDelete, setNodeToDelete] = useState<NodeToDelete | null>(null)

  // Handle remove node - prepares for confirmation
  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      if (!workflowNodes) return

      // Find the node to get its details for the confirmation dialog
      const node = workflowNodes.find((n) => n.nodeId === nodeId)
      if (node) {
        setNodeToDelete({
          nodeId: node.nodeId,
          type: node.type,
          label: node.label,
          agentId: node.agentId,
        })
      }
    },
    [workflowNodes]
  )

  // Confirm delete node - actually performs deletion
  const confirmDeleteNode = useCallback(async () => {
    if (!nodeToDelete || !selectedWorkflow || !isAuthenticated) return

    try {
      await removeNodeMutation({
        workflowId: selectedWorkflow._id,
        nodeId: nodeToDelete.nodeId,
      })
      setNodeToDelete(null)
    } catch (error) {
      console.error("Failed to remove node:", error)
    }
  }, [nodeToDelete, selectedWorkflow, isAuthenticated, removeNodeMutation])

  // Change which agent is assigned to a node
  const handleChangeNodeAgent = useCallback(
    async (nodeId: string, agent: Agent) => {
      if (!selectedWorkflow || !isAuthenticated) return

      try {
        await updateNodeMutation({
          workflowId: selectedWorkflow._id,
          nodeId: nodeId,
          agentId: agent._id,
          label: agent.name, // Update label to agent name
        })
      } catch (error) {
        console.error("Failed to assign agent:", error)
      }
    },
    [selectedWorkflow, isAuthenticated, updateNodeMutation]
  )

  // Add a new step with an agent to an existing parent
  const handleAddStepWithAgent = useCallback(
    async (parentNodeId: string, agent: Agent) => {
      if (!selectedWorkflow || !isAuthenticated) return

      try {
        // Generate a unique node ID
        const nodeId = `node_${Date.now()}`

        // Create the node with agent assigned in one operation
        await addNodeMutation({
          workflowId: selectedWorkflow._id,
          nodeId,
          parentNodeId,
          type: "step",
          agentId: agent._id,
          label: agent.name,
          order: 0,
        })
      } catch (error) {
        console.error("Failed to add step with agent:", error)
      }
    },
    [selectedWorkflow, isAuthenticated, addNodeMutation]
  )

  // Add the first step to a workflow (root node)
  const handleAddFirstStep = useCallback(
    async (agent: Agent) => {
      if (!selectedWorkflow || !isAuthenticated) return

      try {
        // Generate a unique node ID for the first step
        const nodeId = `node_${Date.now()}`

        // Create the first node as root node
        await addNodeMutation({
          workflowId: selectedWorkflow._id,
          nodeId,
          parentNodeId: undefined, // No parent = root node
          type: "step",
          agentId: agent._id,
          label: agent.name,
          order: 0,
        })

        // Update the workflow's rootNodeId to point to this first node
        await onEditWorkflow({
          id: selectedWorkflow._id,
          name: selectedWorkflow.name,
          description: selectedWorkflow.description,
          instructions: selectedWorkflow.instructions,
          rootNodeId: nodeId, // Update to point to the first actual step
          isPublic: selectedWorkflow.isPublic,
          userId: selectedWorkflow.userId,
        })
      } catch (error) {
        console.error("Failed to add first step:", error)
      }
    },
    [selectedWorkflow, isAuthenticated, addNodeMutation, onEditWorkflow]
  )

  return {
    // State
    nodeToDelete,
    setNodeToDelete,
    
    // Handlers
    handleRemoveNode,
    confirmDeleteNode,
    handleChangeNodeAgent,
    handleAddStepWithAgent,
    handleAddFirstStep,
  }
}