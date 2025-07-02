import { logger } from "../../lib/logger"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { tool } from "ai"
import type { ConvexHttpClient } from "convex/browser"
import { z } from "zod"

// Tool factory functions that create tools with a specific Convex client
// This ensures proper request isolation and prevents auth state leakage

export function createGetMcpServers(client: ConvexHttpClient) {
  return tool({
    description: "Get available MCP servers",
    parameters: z.object({}), // No userId parameter needed
    execute: async () => {
      try {
        const mcpServers = await client.query(api.generation.getMcpServersForUser, {})

        return mcpServers.map((server: Doc<"mcp">) => ({
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
}

export function createCreateAgent(client: ConvexHttpClient) {
  return tool({
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
        const models = await client.query(api.generation.getModels, {})

        if (models.length === 0) {
          throw new Error("No models available")
        }

        // Use a free model as default (could be improved to let AI choose based on requirements)
        const defaultModel = models.find((m: Doc<"models">) => !m.requiresApiKey) || models[0]

        if (!defaultModel) {
          throw new Error("No default model found")
        }

        // Create the agent using the user-based mutation
        const result = await client.mutation(api.generation.createAgentForUser, {
          name: params.name,
          systemPrompt: params.systemPrompt,
          mcpServers: params.mcpServerIds as Id<"mcp">[],
          outputType: params.outputFormat,
          aiModelId: defaultModel._id,
          isPublic: false,
        })

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
}

export function createGetAgents(client: ConvexHttpClient) {
  return tool({
    description: "Get available agents (both public and user's private agents)",
    parameters: z.object({}), // No userId parameter needed
    execute: async () => {
      try {
        const agents = await client.query(api.generation.getAgentsForUser, {})

        return agents.map((agent: Doc<"agents">) => ({
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
}

export function createCreateWorkflow(client: ConvexHttpClient) {
  return tool({
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
            input: z.string().optional().describe("The input prompt or context for this step (optional - workflow instructions are used if not provided)"),
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
        const result = await client.mutation(api.generation.createWorkflowForUser, {
          name: params.name,
          description: params.description,
          instructions: params.instructions,
          steps: stepsWithNodeIds,
          isPublic: false,
        })

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
}

// Legacy exports for backward compatibility (will be removed)
export const getMcpServers = createGetMcpServers
export const createAgent = createCreateAgent
export const getAgents = createGetAgents
export const createWorkflow = createCreateWorkflow
