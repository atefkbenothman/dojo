import { logger } from "../../lib/logger"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { tool } from "ai"
import type { ConvexHttpClient } from "convex/browser"
import { z } from "zod"

// Tool factory functions that create tools with a specific Convex client
// This ensures proper request isolation and prevents auth state leakage

// Agent-related tools have been removed as we now use generateObject instead of tool-based generation
// However, these tools are still needed for workflow generation which can create agents

export function createGetMcpServers(client: ConvexHttpClient) {
  return tool({
    description: "Get user's MCP servers available for agent creation",
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
    description: "Create a new agent for use in workflows",
    parameters: z.object({
      name: z.string().describe("The name of the agent"),
      systemPrompt: z.string().describe("The system prompt that guides the agent's behavior"),
      mcpServerIds: z.array(z.string()).describe("Array of MCP server IDs. Use the 'id' field from getMcpServers results, NOT the server name."),
      outputFormat: z
        .enum(["text", "object"])
        .describe("The output format - text for general responses, object for structured data"),
    }),
    execute: async (params) => {
      try {
        // Get available models and MCP servers
        const models = await client.query(api.generation.getModels, {})
        const availableMcpServers = await client.query(api.generation.getMcpServersForUser, {})

        // Use first free model as default
        const defaultModel = models.find((m) => !m.requiresApiKey)
        if (!defaultModel) {
          throw new Error("No default model found")
        }

        // Validate and resolve MCP server IDs
        const validMcpServerIds: Id<"mcp">[] = []
        for (const providedId of params.mcpServerIds) {
          const matchingServer = availableMcpServers.find(
            (server: Doc<"mcp">) => server._id === providedId
          )
          
          if (matchingServer) {
            validMcpServerIds.push(matchingServer._id)
          } else {
            logger.info(
              "Generation tools", 
              `Invalid MCP server ID provided for agent creation: ${providedId}. Skipping.`
            )
          }
        }

        // Create the agent
        const result = await client.mutation(api.generation.createAgentForUser, {
          name: params.name,
          systemPrompt: params.systemPrompt,
          mcpServers: validMcpServerIds,
          outputType: params.outputFormat,
          aiModelId: defaultModel._id,
        })

        logger.info("Generation tools", `Successfully created agent for workflow: ${result.agentId}`)
        return {
          success: true,
          agentId: result.agentId,
          name: params.name,
        }
      } catch (error) {
        logger.error("Generation tools", "Error creating agent for workflow", error)
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
    description: "Get user's agents",
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
      instructions: z.string().describe("General instructions for the workflow that guide all steps"),
      steps: z
        .array(
          z.object({
            name: z.string().describe("The name of this step"),
            agentId: z.string().describe("The exact agent ID returned from createAgent or getAgents calls. Must be a valid Convex ID (e.g., 'jd7abc123...'). Do NOT use agent names or create your own IDs."),
          }),
        )
        .describe("The steps that make up this workflow"),
    }),
    execute: async (params) => {
      try {
        // Validate agent IDs before creating workflow
        const availableAgents = await client.query(api.generation.getAgentsForUser, {})
        const validAgentIds: Id<"agents">[] = []

        for (const step of params.steps) {
          const matchingAgent = availableAgents.find(
            (agent: Doc<"agents">) => agent._id === step.agentId
          )
          
          if (matchingAgent) {
            validAgentIds.push(matchingAgent._id)
          } else {
            const availableIds = availableAgents.map(a => `${a.name} (${a._id})`).join(", ")
            logger.error(
              "Generation tools",
              `Invalid agent ID provided for workflow step "${step.name}": ${step.agentId}. Available agents: ${availableIds}`
            )
            throw new Error(
              `Invalid agent ID "${step.agentId}" for step "${step.name}". Use exact IDs from createAgent results or getAgents. Available: ${availableIds}`
            )
          }
        }

        // Generate node IDs for the steps
        const stepsWithNodeIds = params.steps.map((step, index) => ({
          nodeId: `step_${index + 1}`,
          name: step.name,
          agentId: validAgentIds[index]!, // Safe because we validated all IDs above
        }))

        // Create the workflow using the user-based mutation
        const result = await client.mutation(api.generation.createWorkflowForUser, {
          name: params.name,
          description: params.description,
          instructions: params.instructions,
          steps: stepsWithNodeIds,
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
