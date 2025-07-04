import type { ConvexHttpClient } from "convex/browser"
import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { AGENT_GENERATOR_PROMPT } from "../ai/prompts"
import { createGetMcpServers, createCreateAgent } from "./tools"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { generateText, type LanguageModel } from "ai"

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

    // Create tools with the authenticated client
    const toolsWithClient = {
      getMcpServers: createGetMcpServers(client),
      createAgent: createCreateAgent(client),
    }

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: AGENT_GENERATOR_PROMPT },
        { role: "user", content: prompt },
      ],
      tools: toolsWithClient,
      toolChoice: "auto",
      maxSteps: 5,
    })

    // Find the createAgent tool result
    // First check toolResults from the last step (for single-step operations)
    let createAgentResult = result.toolResults?.find((tr) => tr.toolName === "createAgent")

    // If not found, search through all steps for multi-step operations
    if (!createAgentResult && result.steps) {
      // Iterate through steps to find the createAgent tool result
      for (const step of result.steps) {
        // Check if this step has tool results
        if (step.toolResults && step.toolResults.length > 0) {
          // Find the createAgent tool result in this step
          const agentResult = step.toolResults.find((tr) => tr.toolName === "createAgent")
          if (agentResult) {
            createAgentResult = agentResult
            break
          }
        }
      }
    }

    // Type guard to check if result has success and agentId
    if (
      createAgentResult &&
      createAgentResult.result &&
      typeof createAgentResult.result === "object" &&
      "success" in createAgentResult.result &&
      createAgentResult.result.success &&
      "agentId" in createAgentResult.result &&
      createAgentResult.result.agentId
    ) {
      logger.info("Agent generation", `Successfully created agent: ${createAgentResult.result.agentId}`)
      return {
        success: true,
        agentId: createAgentResult.result.agentId as string,
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
