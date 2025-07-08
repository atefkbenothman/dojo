import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { AGENT_GENERATOR_PROMPT } from "../ai/prompts"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { agentsFields } from "@dojo/db/convex/schema"
import { generateObject, type LanguageModel } from "ai"
import { convexToZodFields } from "convex-helpers/server/zod"
import type { ConvexHttpClient } from "convex/browser"
import { z } from "zod"

// Schema for generated agent specification using convex-helpers
// Pick the fields we need from the agents schema
const { name, systemPrompt, outputType } = agentsFields

const agentSchema = z.object({
  ...convexToZodFields({ name, systemPrompt, outputType }),
  // Override mcpServers to accept strings during generation (we'll validate/convert later)
  mcpServerIds: z.array(z.string()).describe("Array of MCP server IDs to connect to this agent"),
})

interface GenerateAgentParams {
  prompt: string
  sessionId: string
  modelId: string
  client: ConvexHttpClient
}

interface GenerateAgentResult {
  success: boolean
  agentId?: string
  error?: string
}

export async function generateAgent({
  prompt,
  sessionId,
  modelId,
  client,
}: GenerateAgentParams): Promise<GenerateAgentResult> {
  try {
    // Get the session to use with model manager
    const session = await client.query(api.sessions.get, {
      sessionId: sessionId as Id<"sessions">,
    })

    if (!session) {
      return {
        success: false,
        error: "Session not found",
      }
    }

    // Get the model using the session and authenticated client
    const model = (await modelManager.getModel(modelId, client)) as LanguageModel

    // Fetch available MCP servers for context injection
    const availableMcpServers = await client.query(api.generation.getMcpServersForUser, {})

    // Create context-rich prompt with available MCP servers
    const contextPrompt = `${prompt}

Available MCP Servers:
${availableMcpServers
  .map((server) => `- ${server.name} (ID: ${server._id}): ${server.summary || "MCP server for " + server.name}`)
  .join("\n")}

When selecting mcpServerIds, use the exact ID values from the list above. Select servers that match the agent's intended functionality.`

    // Generate structured object instead of using tools
    const result = await generateObject({
      model,
      schema: agentSchema,
      messages: [
        { role: "system", content: AGENT_GENERATOR_PROMPT },
        { role: "user", content: contextPrompt },
      ],
      maxTokens: 2000,
    })

    const generatedAgent = result.object

    // Validate that the generated MCP server IDs exist in the user's available servers
    const validMcpServerIds: Id<"mcp">[] = []
    for (const providedId of generatedAgent.mcpServerIds) {
      const matchingServer = availableMcpServers.find((server) => server._id === providedId)

      if (matchingServer) {
        validMcpServerIds.push(matchingServer._id)
      } else {
        logger.info("Agent generation", `Invalid MCP server ID generated: ${providedId}. Skipping.`)
      }
    }

    // Get default model for the agent (first free model)
    const models = await client.query(api.generation.getModels, {})
    const defaultModel = models.find((m) => !m.requiresApiKey)

    if (!defaultModel) {
      throw new Error("No default model found")
    }

    // Create the agent in the database
    const createResult = await client.mutation(api.generation.createAgentForUser, {
      name: generatedAgent.name,
      systemPrompt: generatedAgent.systemPrompt,
      mcpServers: validMcpServerIds,
      outputType: generatedAgent.outputType,
      aiModelId: defaultModel._id,
    })

    logger.info("Agent generation", `Successfully created agent: ${createResult.agentId}`)
    return {
      success: true,
      agentId: createResult.agentId,
    }
  } catch (error) {
    logger.error("Agent generation", "Agent generation error", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
