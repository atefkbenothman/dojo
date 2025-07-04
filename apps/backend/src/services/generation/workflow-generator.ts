import type { ConvexHttpClient } from "convex/browser"
import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { WORKFLOW_GENERATOR_PROMPT } from "../ai/prompts"
import { createGetAgents, createCreateWorkflow } from "./tools"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { generateText, type LanguageModel } from "ai"

interface GenerateWorkflowParams {
  prompt: string
  sessionId: string
  modelId: string
  client: ConvexHttpClient
}

interface GenerateWorkflowResult {
  success: boolean
  workflowId?: string
  error?: string
}

export async function generateWorkflow({
  prompt,
  sessionId,
  modelId,
  client,
}: GenerateWorkflowParams): Promise<GenerateWorkflowResult> {
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
      getAgents: createGetAgents(client),
      createWorkflow: createCreateWorkflow(client),
    }

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: WORKFLOW_GENERATOR_PROMPT },
        { role: "user", content: prompt },
      ],
      tools: toolsWithClient,
      toolChoice: "auto",
      maxSteps: 5,
    })

    // Find the createWorkflow tool result
    // First check toolResults from the last step (for single-step operations)
    let createWorkflowResult = result.toolResults?.find((tr) => tr.toolName === "createWorkflow")

    // If not found, search through all steps for multi-step operations
    if (!createWorkflowResult && result.steps) {
      // Iterate through steps to find the createWorkflow tool result
      for (const step of result.steps) {
        // Check if this step has tool results
        if (step.toolResults && step.toolResults.length > 0) {
          // Find the createWorkflow tool result in this step
          const workflowResult = step.toolResults.find((tr) => tr.toolName === "createWorkflow")
          if (workflowResult) {
            createWorkflowResult = workflowResult
            break
          }
        }
      }
    }

    // Type guard to check if result has success and workflowId
    if (
      createWorkflowResult &&
      createWorkflowResult.result &&
      typeof createWorkflowResult.result === "object" &&
      "success" in createWorkflowResult.result &&
      createWorkflowResult.result.success &&
      "workflowId" in createWorkflowResult.result &&
      createWorkflowResult.result.workflowId
    ) {
      logger.info("Workflow generation", `Successfully created workflow: ${createWorkflowResult.result.workflowId}`)
      return {
        success: true,
        workflowId: createWorkflowResult.result.workflowId as string,
      }
    }

    // If no workflow was created, return an error
    return {
      success: false,
      error: "Failed to create workflow - AI did not call the creation tool",
    }
  } catch (error) {
    logger.error("Workflow generation", "Workflow generation error", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
