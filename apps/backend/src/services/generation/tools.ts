import { convex } from "../../lib/convex-client"
import { logger } from "../../lib/logger"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { tool } from "ai"
import { z } from "zod"

// Tool definitions for AI generation service
// These tools allow the AI to query and create entities in the database

// Type definitions for expected responses
interface MCPServer {
  _id: string
  name: string
  summary?: string
  transportType: string
  localOnly?: boolean
  requiresUserKey: boolean
}

interface Agent {
  _id: string
  name: string
  systemPrompt: string
  outputType: string
  mcpServers: string[]
}

interface Model {
  _id: string
  requiresApiKey?: boolean
}

// Shared context for tracking generated IDs across tool calls
export const generationContext = new Map<string, string>()

// Factory function to create user-scoped tools
// The auth token must be set on the convex client before calling this function
export function createUserScopedTools() {
  const getMcpServers = tool({
    description: "Get available MCP servers",
    parameters: z.object({}), // No userId parameter needed
    execute: async () => {
      try {
        const mcpServers = await convex.query(api.generation.getMcpServersForUser, {})

        return mcpServers.map((server: MCPServer) => ({
          id: server._id,
          name: server.name,
          description: server.summary,
          transportType: server.transportType,
          localOnly: server.localOnly,
          requiresUserKey: server.requiresUserKey,
        }))
      } catch (error) {
        logger.error("Generation tools", "Error fetching MCP servers", error)
        return []
      }
    },
  })

  const createAgent = tool({
    description: "Create a new agent in the database",
    parameters: z.object({
      name: z.string().describe("The name of the agent"),
      systemPrompt: z.string().describe("The system prompt that guides the agent's behavior"),
      mcpServerIds: z.array(z.string()).describe("Array of MCP server IDs to connect to this agent"),
      outputFormat: z
        .enum(["text", "object"])
        .describe("The output format - text for general responses, object for structured data"),
      isPublic: z.boolean().describe("Whether this agent should be publicly accessible"),
    }),
    execute: async (params) => {
      try {
        // Get available models
        const models = await convex.query(api.generation.getModels, {})

        if (models.length === 0) {
          throw new Error("No models available")
        }

        // Use a free model as default (could be improved to let AI choose based on requirements)
        const defaultModel = models.find((m: Model) => !m.requiresApiKey) || models[0]

        if (!defaultModel) {
          throw new Error("No default model found")
        }

        // Create the agent using the user-based mutation
        const result = await convex.mutation(api.generation.createAgentForUser, {
          name: params.name,
          systemPrompt: params.systemPrompt,
          mcpServers: params.mcpServerIds as Id<"mcp">[],
          outputType: params.outputFormat,
          aiModelId: defaultModel._id,
          isPublic: params.isPublic || false,
        })

        // Store the created agent ID in context for retrieval
        generationContext.set("createdAgentId", result.agentId)

        return {
          success: true,
          agentId: result.agentId,
        }
      } catch (error) {
        logger.error("Generation tools", "Error creating agent", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create agent",
        }
      }
    },
  })

  const getAgents = tool({
    description: "Get available agents (both public and user's private agents)",
    parameters: z.object({}), // No userId parameter needed
    execute: async () => {
      try {
        const agents = await convex.query(api.generation.getAgentsForUser, {})

        return agents.map((agent: Agent) => ({
          id: agent._id,
          name: agent.name,
          systemPrompt: agent.systemPrompt,
          outputType: agent.outputType,
          mcpServers: agent.mcpServers,
        }))
      } catch (error) {
        logger.error("Generation tools", "Error fetching agents", error)
        return []
      }
    },
  })

  const createWorkflow = tool({
    description: "Create a new workflow in the database",
    parameters: z.object({
      name: z.string().describe("The name of the workflow"),
      description: z.string().describe("A description of what the workflow does"),
      instructions: z.string().describe("General instructions for the workflow"),
      steps: z
        .array(
          z.object({
            name: z.string().describe("The name of this step"),
            agentId: z.string().describe("The ID of the agent to use for this step"),
            input: z.string().describe("The input prompt or context for this step"),
          }),
        )
        .describe("The steps that make up this workflow"),
      isPublic: z.boolean().describe("Whether this workflow should be publicly accessible"),
    }),
    execute: async (params) => {
      try {
        // Generate node IDs for the steps
        const stepsWithNodeIds = params.steps.map((step, index) => ({
          nodeId: `step_${index + 1}`,
          name: step.name,
          agentId: step.agentId as Id<"agents">,
          input: step.input,
        }))

        // Create the workflow using the user-based mutation
        const result = await convex.mutation(api.generation.createWorkflowForUser, {
          name: params.name,
          description: params.description,
          instructions: params.instructions,
          steps: stepsWithNodeIds,
          isPublic: params.isPublic || false,
        })

        // Store the created workflow ID in context for retrieval
        generationContext.set("createdWorkflowId", result.workflowId)

        return {
          success: true,
          workflowId: result.workflowId,
        }
      } catch (error) {
        logger.error("Generation tools", "Error creating workflow", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create workflow",
        }
      }
    },
  })

  return {
    getMcpServers,
    createAgent,
    getAgents,
    createWorkflow,
  }
}
