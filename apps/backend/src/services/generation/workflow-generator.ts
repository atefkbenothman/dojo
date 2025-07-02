import { createRequestClient } from "../../lib/convex-request-client"
import { logger } from "../../lib/logger"
import { modelManager } from "../ai/model-manager"
import { createGetAgents, createCreateWorkflow } from "./tools"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { generateText, type LanguageModel } from "ai"

interface GenerateWorkflowParams {
  prompt: string
  sessionId: string
  modelId: string
  authToken: string
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
  authToken,
}: GenerateWorkflowParams): Promise<GenerateWorkflowResult> {
  try {
    // Create a client with auth for this request
    const client = createRequestClient(authToken)

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
    const model = (await modelManager.getModel(modelId, session)) as LanguageModel

    const systemPrompt = `You are an AI assistant that generates workflow configurations for Dojo, an AI agent workflow platform.

Your task:
1. First, use the getAgents tool to see what agents are available
2. Based on the user's request, design a workflow that:
   - Has a clear, descriptive name
   - Has a helpful description
   - Consists of a logical sequence of steps
   - Each step uses an appropriate agent
   - Each step has clear input/instructions
3. Use the createWorkflow tool to create the workflow in the database

Guidelines for workflow design:
- Break down complex tasks into logical steps
- Choose agents based on their capabilities
- Ensure data flows logically from one step to the next
- The output of one step often becomes part of the input for the next step
- Keep step names clear and descriptive

Guidelines for step inputs:
- The input field is optional - if not provided, the workflow's general instructions will guide the step
- When you do provide input, be specific about what that step should do
- Reference previous steps' outputs when needed (e.g., "Using the analysis from step 1...")
- Include any specific requirements or constraints
- Consider if step-specific instructions would add value beyond the workflow instructions

Example workflow structure:
- Step 1: Research (using a web search agent)
- Step 2: Analyze findings (using an analysis agent)
- Step 3: Generate report (using a writing agent)

Always create workflows as private (isPublic: false) unless the user explicitly requests a public workflow.`

    // Create tools with the authenticated client
    const toolsWithClient = {
      getAgents: createGetAgents(client),
      createWorkflow: createCreateWorkflow(client),
    }

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
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
