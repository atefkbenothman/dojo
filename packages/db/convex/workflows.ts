import { Id } from "./_generated/dataModel"
import { mutation, query, QueryCtx, internalMutation } from "./_generated/server"
import { workflowsFields } from "./schema"
import { v } from "convex/values"

// Helper to get current userId (or null if not authenticated)
async function getCurrentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return identity.subject.split("|")[0] as Id<"users">
}

// Helper to validate agent usage based on workflow visibility
async function validateAgentForWorkflow(ctx: QueryCtx, workflowIsPublic: boolean | undefined, agentId: Id<"agents">) {
  const agent = await ctx.db.get(agentId)
  if (!agent) throw new Error("Agent not found")

  if (workflowIsPublic) {
    // Public workflows can only use public agents
    if (!agent.isPublic) {
      throw new Error("Public workflows cannot use private agents. Public workflows must only use public agents.")
    }
  } else {
    // Private workflows cannot use public agents
    if (agent.isPublic) {
      throw new Error(
        "Private workflows cannot use public agents. Public agents are only available for public workflows.",
      )
    }
  }
}

// Workflow tree validation functions
function validateWorkflowTree(
  nodes: Array<{ nodeId: string; parentNodeId?: string; agentId: Id<"agents"> }>,
  agentIds: Set<Id<"agents">>,
): string | null {
  if (nodes.length === 0) return null

  // Check agent references
  for (const node of nodes) {
    if (!agentIds.has(node.agentId)) {
      return `Node ${node.nodeId} references non-existent agent`
    }
  }

  // Check for single root
  const rootNodes = nodes.filter((n) => !n.parentNodeId)
  if (rootNodes.length === 0) {
    return "Workflow must have exactly one root node"
  }
  if (rootNodes.length > 1) {
    return "Workflow cannot have multiple root nodes"
  }

  // Check for valid parent references
  const nodeIds = new Set(nodes.map((n) => n.nodeId))
  for (const node of nodes) {
    if (node.parentNodeId && !nodeIds.has(node.parentNodeId)) {
      return `Node ${node.nodeId} references non-existent parent ${node.parentNodeId}`
    }
  }

  // Check for cycles
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    if (visiting.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visiting.add(nodeId)
    const children = nodes.filter((n) => n.parentNodeId === nodeId)
    for (const child of children) {
      if (hasCycle(child.nodeId)) return true
    }
    visiting.delete(nodeId)
    visited.add(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.nodeId) && hasCycle(node.nodeId)) {
      return `Circular dependency detected involving node ${node.nodeId}`
    }
  }

  // Check for orphaned nodes (unreachable from root)
  const reachable = new Set<string>()
  const rootNode = rootNodes[0]
  if (!rootNode) return "No root node found" // This shouldn't happen due to earlier check

  const queue = [rootNode.nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachable.has(current)) continue
    reachable.add(current)

    const children = nodes.filter((n) => n.parentNodeId === current)
    for (const child of children) {
      queue.push(child.nodeId)
    }
  }

  const orphaned = nodes.filter((n) => !reachable.has(n.nodeId))
  if (orphaned.length > 0) {
    return `Found orphaned nodes: ${orphaned.map((n) => n.nodeId).join(", ")}`
  }

  return null
}

// List: Return all public workflows and, if authenticated, also user-specific workflows
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)

    // Always get public workflows
    const publicWorkflows = await ctx.db
      .query("workflows")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect()

    if (userId) {
      // Authenticated: also get user's private workflows
      const userWorkflows = await ctx.db
        .query("workflows")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.neq(q.field("isPublic"), true))
        .collect()

      return [...publicWorkflows, ...userWorkflows]
    } else {
      // Not authenticated: return only public workflows
      return publicWorkflows
    }
  },
})

// Get: Return a single workflow if it's public or belongs to the user
export const get = query({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.id)
    if (!workflow) return null
    if (workflow.isPublic || (userId && workflow.userId === userId)) {
      return workflow
    }
    throw new Error("Unauthorized")
  },
})

// Edit: Only allow editing if not public and user is the owner
export const edit = mutation({
  args: {
    id: v.id("workflows"),
    ...workflowsFields,
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(id)
    if (!workflow) throw new Error("Not found")
    if (workflow.isPublic) throw new Error("Default workflows cannot be edited.")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")
    return await ctx.db.replace(id, { ...workflow, ...rest })
  },
})

// Create: Only allow creating user-specific workflows (not public)
export const create = mutation({
  args: workflowsFields,
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (args.isPublic) throw new Error("Cannot create public workflows.")
    if (!userId) throw new Error("Must be signed in to create workflows.")

    // Validate rootNodeId if provided
    if (args.rootNodeId) {
      throw new Error("Cannot create workflow with rootNodeId. Add nodes first, then root will be set automatically.")
    }

    // Create the workflow (no auto-created nodes - user will add first step)
    const workflowId = await ctx.db.insert("workflows", { ...args, userId, rootNodeId: undefined })

    return workflowId
  },
})

// Remove: Only allow deleting if not public and user is the owner
export const remove = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.id)
    if (!workflow) throw new Error("Not found")
    if (workflow.isPublic) throw new Error("Default workflows cannot be deleted.")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")

    // Delete all workflow nodes associated with this workflow
    const workflowNodes = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.id))
      .collect()

    // Delete all nodes first
    for (const node of workflowNodes) {
      await ctx.db.delete(node._id)
    }

    // Then delete the workflow itself
    return await ctx.db.delete(args.id)
  },
})

// Clone: Create a private copy of any workflow (public or user's own)
export const clone = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) throw new Error("Must be signed in to clone workflows.")

    const originalWorkflow = await ctx.db.get(args.id)
    if (!originalWorkflow) throw new Error("Workflow not found")

    // Check if user can access this workflow (either public or owned by user)
    if (!originalWorkflow.isPublic && originalWorkflow.userId !== userId) {
      throw new Error("Unauthorized")
    }

    // Create a clone with isPublic: false and new userId
    const {
      _id,
      _creationTime,
      userId: _originalUserId,
      isPublic: _originalIsPublic,
      ...workflowData
    } = originalWorkflow

    const newWorkflowId = await ctx.db.insert("workflows", {
      ...workflowData,
      name: `${originalWorkflow.name} (Copy)`,
      userId,
      isPublic: false, // Always make clones private
    })

    // Clone all workflow nodes, cloning public agents as needed
    const originalNodes = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.id))
      .collect()

    // Maps to track cloned resources to avoid duplicates
    const clonedAgentMap = new Map<Id<"agents">, Id<"agents">>()
    const clonedMcpMap = new Map<Id<"mcp">, Id<"mcp">>()

    for (const node of originalNodes) {
      const { _id, _creationTime, workflowId, agentId, ...nodeData } = node

      let newAgentId = agentId
      if (agentId) {
        // Check if we've already cloned this agent
        if (clonedAgentMap.has(agentId)) {
          newAgentId = clonedAgentMap.get(agentId)!
        } else {
          const agent = await ctx.db.get(agentId)
          if (agent) {
            if (agent.isPublic) {
              // Clone the public agent (which will also clone its MCP servers)
              // We need to manually clone the agent here since we can't call mutations from mutations
              const {
                _id: _agentId,
                _creationTime: _agentCreationTime,
                userId: _agentUserId,
                isPublic: _agentIsPublic,
                ...agentData
              } = agent

              // Clone public MCP servers for this agent
              let clonedMcpServers = agentData.mcpServers
              if (agentData.mcpServers && agentData.mcpServers.length > 0) {
                const newMcpServerIds = []
                for (const mcpServerId of agentData.mcpServers) {
                  const mcpServer = await ctx.db.get(mcpServerId)
                  if (!mcpServer) continue

                  if (mcpServer.isPublic) {
                    // Check if we've already cloned this MCP server
                    if (clonedMcpMap.has(mcpServerId)) {
                      newMcpServerIds.push(clonedMcpMap.get(mcpServerId)!)
                    } else {
                      // Clone the public MCP server
                      const {
                        _id: _mcpId,
                        _creationTime: _mcpCreationTime,
                        userId: _mcpUserId,
                        isPublic: _mcpIsPublic,
                        isTemplate: _mcpIsTemplate,
                        ...mcpData
                      } = mcpServer
                      const clonedMcpId = await ctx.db.insert("mcp", {
                        ...mcpData,
                        name: `${mcpServer.name} (Copy)`,
                        userId,
                        isPublic: false,
                        isTemplate: false,
                      })
                      clonedMcpMap.set(mcpServerId, clonedMcpId)
                      newMcpServerIds.push(clonedMcpId)
                    }
                  } else if (mcpServer.userId === userId) {
                    // User already owns this MCP server
                    newMcpServerIds.push(mcpServerId)
                  }
                }
                clonedMcpServers = newMcpServerIds
              }

              const clonedAgentId = await ctx.db.insert("agents", {
                ...agentData,
                mcpServers: clonedMcpServers,
                name: `${agent.name} (Copy)`,
                userId,
                isPublic: false,
              })
              clonedAgentMap.set(agentId, clonedAgentId)
              newAgentId = clonedAgentId
            } else if (agent.userId === userId) {
              // User already owns this agent, just reference it
              newAgentId = agentId
            } else {
              // User doesn't have access to this private agent, skip the node
              continue
            }
          } else {
            // Agent not found, skip the node
            continue
          }
        }
      }

      // Only insert the node if we have a valid agent ID
      if (newAgentId) {
        await ctx.db.insert("workflowNodes", {
          ...nodeData,
          workflowId: newWorkflowId,
          agentId: newAgentId,
        })
      }
    }

    return newWorkflowId
  },
})

// Add a new workflow node
export const addNode = mutation({
  args: {
    workflowId: v.id("workflows"),
    nodeId: v.string(),
    parentNodeId: v.optional(v.string()),
    type: v.literal("step"),
    agentId: v.id("agents"),
    label: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.workflowId)

    if (!workflow) throw new Error("Workflow not found")
    if (workflow.isPublic) throw new Error("Cannot edit public workflows")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")

    // Validate agent usage for private workflows
    await validateAgentForWorkflow(ctx, workflow.isPublic, args.agentId)

    // Check if node ID already exists
    const existingNode = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow_nodeId", (q) => q.eq("workflowId", args.workflowId).eq("nodeId", args.nodeId))
      .first()

    if (existingNode) {
      throw new Error(`Node ${args.nodeId} already exists in workflow`)
    }

    // Get existing nodes and validate the tree structure after adding
    const existingNodes = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect()

    // Get all agents to validate references
    const agents = await ctx.db.query("agents").collect()
    const agentIds = new Set(agents.map((a) => a._id))

    // Simulate adding the new node
    const newNode = {
      nodeId: args.nodeId,
      parentNodeId: args.parentNodeId,
      agentId: args.agentId,
    }
    const simulatedNodes = [...existingNodes, newNode]

    // Validate the tree structure
    const validationError = validateWorkflowTree(simulatedNodes, agentIds)
    if (validationError) {
      throw new Error(validationError)
    }

    // Insert the new node
    const nodeId = await ctx.db.insert("workflowNodes", args)

    // Set as root node if this is the first node
    if (existingNodes.length === 0) {
      await ctx.db.patch(args.workflowId, { rootNodeId: args.nodeId })
    }

    return nodeId
  },
})

// Remove a workflow node and its children
export const removeNode = mutation({
  args: {
    workflowId: v.id("workflows"),
    nodeId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.workflowId)

    if (!workflow) throw new Error("Workflow not found")
    if (workflow.isPublic) throw new Error("Cannot edit public workflows")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")

    // Find the node to delete
    const node = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow_nodeId", (q) => q.eq("workflowId", args.workflowId).eq("nodeId", args.nodeId))
      .first()

    if (!node) {
      throw new Error(`Node ${args.nodeId} not found`)
    }

    // Get all nodes to find children that need to be deleted
    const allNodes = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect()

    // Find all descendants using iterative approach
    const nodesToDelete: Id<"workflowNodes">[] = [node._id]
    const queue = [args.nodeId]

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!
      const children = allNodes.filter((n) => n.parentNodeId === currentNodeId)

      for (const child of children) {
        nodesToDelete.push(child._id)
        queue.push(child.nodeId)
      }
    }

    // Delete all nodes (cascading to children)
    for (const nodeId of nodesToDelete) {
      await ctx.db.delete(nodeId)
    }

    // If this was the root node, clear the workflow's rootNodeId
    if (workflow.rootNodeId === args.nodeId) {
      await ctx.db.patch(args.workflowId, { rootNodeId: undefined })
    }
  },
})

// Update a workflow node
export const updateNode = mutation({
  args: {
    workflowId: v.id("workflows"),
    nodeId: v.string(),
    agentId: v.optional(v.id("agents")),
    parentNodeId: v.optional(v.string()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.workflowId)

    if (!workflow) throw new Error("Workflow not found")
    if (workflow.isPublic) throw new Error("Cannot edit public workflows")
    if (!userId || workflow.userId !== userId) throw new Error("Unauthorized")

    // Validate agent usage for private workflows if agentId is being updated
    if (args.agentId !== undefined) {
      await validateAgentForWorkflow(ctx, workflow.isPublic, args.agentId)
    }

    // Find the node to update
    const node = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow_nodeId", (q) => q.eq("workflowId", args.workflowId).eq("nodeId", args.nodeId))
      .first()

    if (!node) throw new Error("Node not found")

    // If updating parent or agent, validate the tree structure
    if (args.parentNodeId !== undefined || args.agentId !== undefined) {
      // Get all nodes
      const allNodes = await ctx.db
        .query("workflowNodes")
        .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
        .collect()

      // Get all agents to validate references
      const agents = await ctx.db.query("agents").collect()
      const agentIds = new Set(agents.map((a) => a._id))

      // Simulate the update
      const simulatedNodes = allNodes.map((n) => {
        if (n.nodeId === args.nodeId) {
          return {
            nodeId: n.nodeId,
            parentNodeId: args.parentNodeId !== undefined ? args.parentNodeId : n.parentNodeId,
            agentId: args.agentId !== undefined ? args.agentId : n.agentId,
          }
        }
        return {
          nodeId: n.nodeId,
          parentNodeId: n.parentNodeId,
          agentId: n.agentId,
        }
      })

      // Validate the tree structure
      const validationError = validateWorkflowTree(simulatedNodes, agentIds)
      if (validationError) {
        throw new Error(validationError)
      }
    }

    // Update the node
    const updateData: Partial<{
      agentId: Id<"agents">
      parentNodeId: string | undefined
      label: string
    }> = {}
    if (args.agentId !== undefined) updateData.agentId = args.agentId
    if (args.parentNodeId !== undefined) updateData.parentNodeId = args.parentNodeId
    if (args.label !== undefined) updateData.label = args.label

    await ctx.db.patch(node._id, updateData)

    // If this was the root node and we're changing its parent, update workflow's rootNodeId
    if (workflow.rootNodeId === args.nodeId && args.parentNodeId !== undefined) {
      // Find the new root node
      const updatedNodes = await ctx.db
        .query("workflowNodes")
        .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
        .collect()

      const newRootNode = updatedNodes.find((n) => !n.parentNodeId)
      await ctx.db.patch(args.workflowId, {
        rootNodeId: newRootNode ? newRootNode.nodeId : undefined,
      })
    }
  },
})

// Get all nodes for a workflow
export const getWorkflowNodes = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    // Authorization guard
    const userId = await getCurrentUserId(ctx)
    const workflow = await ctx.db.get(args.workflowId)

    // Return empty array if workflow doesn't exist instead of throwing error
    // This prevents UI errors when workflow is deleted but queries are still running
    if (!workflow) return []

    // Only allow if public or owned by the caller
    if (!workflow.isPublic && (!userId || workflow.userId !== userId)) {
      throw new Error("Unauthorized")
    }

    // Get all workflow nodes for this workflow
    const allNodes = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect()

    // Get all agents to check for valid references
    const agents = await ctx.db.query("agents").collect()
    const validAgentIds = new Set(agents.map((agent) => agent._id))

    // Filter out orphaned nodes
    const validNodes = allNodes.filter((node) => {
      // Node must reference a valid agent
      if (!validAgentIds.has(node.agentId)) {
        return false
      }

      // If node has a parent, the parent must exist in the workflow
      if (node.parentNodeId) {
        const parentExists = allNodes.some((parentNode) => parentNode.nodeId === node.parentNodeId)
        if (!parentExists) {
          return false
        }
      }

      return true
    })

    return validNodes
  },
})

// Internal function to clean up orphaned workflow nodes
export const cleanupOrphanedNodes = internalMutation({
  handler: async (ctx) => {
    // Get all workflow nodes and agents
    const allWorkflowNodes = await ctx.db.query("workflowNodes").collect()
    const agents = await ctx.db.query("agents").collect()
    const validAgentIds = new Set(agents.map((agent) => agent._id))

    let deletedCount = 0

    for (const node of allWorkflowNodes) {
      let shouldDelete = false

      // Check if agent reference is invalid
      if (!validAgentIds.has(node.agentId)) {
        shouldDelete = true
      }

      // Check if parent reference is invalid (only if node has a parent)
      if (!shouldDelete && node.parentNodeId) {
        const parentExists = allWorkflowNodes.some(
          (parentNode) => parentNode.nodeId === node.parentNodeId && parentNode.workflowId === node.workflowId,
        )
        if (!parentExists) {
          shouldDelete = true
        }
      }

      if (shouldDelete) {
        await ctx.db.delete(node._id)
        deletedCount++
      }
    }

    console.log(`Cleaned up ${deletedCount} orphaned workflow nodes`)
    return { deletedCount }
  },
})
