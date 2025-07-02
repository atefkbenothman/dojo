import { createClientFromAuth } from "../../lib/convex-request-client"
import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { createGetMcpServers, createCreateAgent } from "./tools"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { generateText, type LanguageModel } from "ai"

interface GenerateAgentParams {
  prompt: string
  sessionId: string
  modelId: string
  authToken: string
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
  authToken,
}: GenerateAgentParams): Promise<GenerateAgentResult> {
  try {
    // Create a client with auth for this request
    const client = createClientFromAuth(authToken)
    
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

    // Get the model using the session
    const model = await modelManager.getModel(modelId, session) as LanguageModel

    const systemPrompt = `You are an AI assistant that generates agent configurations for Dojo, an AI agent workflow platform.

Your task:
1. First, use the getMcpServers tool to see what MCP servers are available
2. Based on the user's request, determine the appropriate agent configuration:
   - A clear, descriptive name
   - An appropriate system prompt that guides the agent's behavior
   - Which MCP servers to connect (based on the required capabilities)
   - The output format (use "text" for general tasks, "object" for structured data output)
3. Use the createAgent tool to create the agent in the database

Guidelines for MCP server selection:
- Match servers based on their names and descriptions
- "filesystem" servers are for file operations
- "web-search" or "brave-search" servers are for internet searches
- "git" servers are for version control operations
- Select multiple servers if the agent needs multiple capabilities

Guidelines for system prompts:
- Be clear and specific about the agent's role
- Include any constraints or guidelines
- Specify the expected output format if relevant

Always create agents as private (isPublic: false) unless the user explicitly requests a public agent.`

    // Create tools with the authenticated client
    const toolsWithClient = {
      getMcpServers: createGetMcpServers(client),
      createAgent: createCreateAgent(client),
    }

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      tools: toolsWithClient,
      toolChoice: "required",
      maxSteps: 5, // Allow multiple tool calls
    })

    // Check if the generation completed successfully
    if (!result.text) {
      return {
        success: false,
        error: "No response generated",
      }
    }

    // Find the createAgent tool result
    const createAgentResult = result.toolResults?.find(
      tr => tr.toolName === 'createAgent'
    )

    // Type guard to check if result has success and agentId
    const agentResult = createAgentResult?.result
    if (agentResult && typeof agentResult === 'object' && 'success' in agentResult && 
        agentResult.success && 'agentId' in agentResult && agentResult.agentId) {
      logger.info("Agent generation", `Successfully created agent: ${agentResult.agentId}`)
      return {
        success: true,
        agentId: agentResult.agentId as string,
      }
    }

    // If no agent was created, return an error
    return {
      success: false,
      error: "Failed to create agent - AI did not call the creation tool",
    }
  } catch (error) {
    logger.error("Agent generation", "Agent generation error", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
