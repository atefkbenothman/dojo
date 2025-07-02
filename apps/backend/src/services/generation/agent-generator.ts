import { convex } from "../../lib/convex-client"
import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { createUserScopedTools, generationContext } from "./tools"
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
    // Get the session to use with model manager
    const session = await convex.query(api.sessions.get, {
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

    // Clear the generation context before starting
    generationContext.clear()
    
    // Set the auth token on the convex client
    convex.setAuth(authToken)
    
    // Create user-scoped tools (auth context will be used from the token)
    const tools = createUserScopedTools()

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      tools: {
        getMcpServers: tools.getMcpServers,
        createAgent: tools.createAgent,
      },
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

    // Check if an agent was created by looking in our context
    const createdAgentId = generationContext.get("createdAgentId")

    if (createdAgentId) {
      logger.info("Agent generation", `Successfully created agent: ${createdAgentId}`)
      return {
        success: true,
        agentId: createdAgentId as string,
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
