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

    // Create the workflow (no auto-created nodes - user will add first step)
    const workflowId = await ctx.db.insert("workflows", { ...args, userId })

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

    // Validate parentNodeId if provided
    if (args.parentNodeId) {
      const parentNode = await ctx.db
        .query("workflowNodes")
        .withIndex("by_workflow_nodeId", (q) => q.eq("workflowId", args.workflowId).eq("nodeId", args.parentNodeId!))
        .first()

      if (!parentNode) {
        throw new Error(`Parent node ${args.parentNodeId} not found in workflow`)
      }
    }

    return await ctx.db.insert("workflowNodes", args)
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

    // Helper function to recursively collect all descendants
    // Iteratively collect all descendants
    const collectDescendants = async (nodeId: string): Promise<Id<"workflowNodes">[]> => {
      const descendants: Id<"workflowNodes">[] = []
      const queue = [nodeId]

      while (queue.length > 0) {
        const currentNodeId = queue.shift()!

        const children = await ctx.db
          .query("workflowNodes")
          .withIndex("by_parent", (q) => q.eq("workflowId", args.workflowId).eq("parentNodeId", currentNodeId))
          .collect()

        for (const child of children) {
          descendants.push(child._id)
          queue.push(child.nodeId)
        }
      }

      return descendants
    }

    // Find the node to delete
    const node = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflow_nodeId", (q) => q.eq("workflowId", args.workflowId).eq("nodeId", args.nodeId))
      .first()

    if (!node) {
      throw new Error(`Node ${args.nodeId} not found`)
    }

    // Collect all nodes to delete (the node itself and all descendants)
    const nodesToDelete = [node._id]
    const descendants = await collectDescendants(args.nodeId)
    nodesToDelete.push(...descendants)

    // Delete all nodes in a single transaction
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
    agentId: v.id("agents"),
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

    // Update the node
    const updateData: Partial<{
      agentId: Id<"agents">
      label: string
    }> = {}
    if (args.agentId !== undefined) updateData.agentId = args.agentId
    if (args.label !== undefined) updateData.label = args.label

    await ctx.db.patch(node._id, updateData)
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
