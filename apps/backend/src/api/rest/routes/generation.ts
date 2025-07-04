import { asyncHandler, throwError } from "../../../lib/errors"
import { logger } from "../../../lib/logger"
import { generateAgent } from "../../../services/generation/agent-generator"
import { generateWorkflow } from "../../../services/generation/workflow-generator"
import { createValidatedRequestMiddleware } from "../middleware"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const generationRouter: Router = express.Router()

// Schema for agent generation request
const generateAgentSchema = z.object({
  prompt: z.string().min(1, { message: "Prompt is required" }),
  generation: z.object({
    modelId: z.string().min(1, { message: "Model ID is required" }),
  }),
})

// Schema for workflow generation request
const generateWorkflowSchema = z.object({
  prompt: z.string().min(1, { message: "Prompt is required" }),
  generation: z.object({
    modelId: z.string().min(1, { message: "Model ID is required" }),
  }),
})

// POST /api/generate/agent
generationRouter.post(
  "/agent",
  createValidatedRequestMiddleware(generateAgentSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { session, client } = req

    // Check authentication
    if (!session || !session.userId) {
      res.status(401).json({
        success: false,
        error: "Authentication required to generate agents with AI",
      })
      return
    }

    const parsedInput = req.parsedInput as z.infer<typeof generateAgentSchema>
    const { prompt, generation } = parsedInput

    // Extract and validate modelId
    const modelId = generation?.modelId
    if (!modelId) {
      throwError("Missing modelId in generation object", 400)
    }

    logger.info("REST /generate/agent", `Generation request from user: ${session.userId}`)

    let generationExecutionId: Id<"agentGenerationExecutions"> | undefined

    try {
      // Create generation execution record
      generationExecutionId = await client.mutation(api.agentGenerationExecutions.create, {
        prompt,
        modelId,
      })

      logger.info("REST /generate/agent", `Created generation execution: ${generationExecutionId}`)

      const result = await generateAgent({
        prompt,
        sessionId: session._id,
        modelId,
        client,
      })

      if (result.success) {
        // Update execution as completed with agentId
        await client.mutation(api.agentGenerationExecutions.updateStatus, {
          executionId: generationExecutionId,
          status: "completed",
          agentId: result.agentId as Id<"agents">,
        })

        logger.info("REST /generate/agent", `Successfully generated agent: ${result.agentId}`)
        res.json({
          success: true,
          agentId: result.agentId,
          generationExecutionId,
        })
      } else {
        // Update execution as failed
        await client.mutation(api.agentGenerationExecutions.updateStatus, {
          executionId: generationExecutionId,
          status: "failed",
          error: result.error || "Failed to generate agent",
        })

        logger.error("REST /generate/agent", `Generation failed: ${result.error}`)
        res.status(400).json({
          success: false,
          error: result.error || "Failed to generate agent",
          generationExecutionId,
        })
      }
    } catch (error) {
      // Update execution as failed if we have an execution ID
      if (generationExecutionId) {
        try {
          await client.mutation(api.agentGenerationExecutions.updateStatus, {
            executionId: generationExecutionId,
            status: "failed",
            error: error instanceof Error ? error.message : "Internal server error during generation",
          })
        } catch (updateError) {
          logger.error("REST /generate/agent", "Failed to update execution status", updateError)
        }
      }

      logger.error("REST /generate/agent", "Unexpected error during generation", error)
      res.status(500).json({
        success: false,
        error: "Internal server error during generation",
        generationExecutionId,
      })
    }
  }),
)

// POST /api/generate/workflow
generationRouter.post(
  "/workflow",
  createValidatedRequestMiddleware(generateWorkflowSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { session, client } = req

    // Check authentication
    if (!session || !session.userId) {
      res.status(401).json({
        success: false,
        error: "Authentication required to generate workflows with AI",
      })
      return
    }

    const parsedInput = req.parsedInput as z.infer<typeof generateWorkflowSchema>
    const { prompt, generation } = parsedInput

    // Extract and validate modelId
    const modelId = generation?.modelId
    if (!modelId) {
      throwError("Missing modelId in generation object", 400)
    }

    logger.info("REST /generate/workflow", `Generation request from user: ${session.userId}`)

    let generationExecutionId: Id<"workflowGenerationExecutions"> | undefined

    try {
      // Create generation execution record
      generationExecutionId = await client.mutation(api.workflowGenerationExecutions.create, {
        prompt,
        modelId,
      })

      logger.info("REST /generate/workflow", `Created generation execution: ${generationExecutionId}`)

      const result = await generateWorkflow({
        prompt,
        sessionId: session._id,
        modelId,
        client,
      })

      if (result.success) {
        // Update execution as completed with workflowId
        await client.mutation(api.workflowGenerationExecutions.updateStatus, {
          executionId: generationExecutionId,
          status: "completed",
          workflowId: result.workflowId as Id<"workflows">,
        })

        logger.info("REST /generate/workflow", `Successfully generated workflow: ${result.workflowId}`)
        res.json({
          success: true,
          workflowId: result.workflowId,
          generationExecutionId,
        })
      } else {
        // Update execution as failed
        await client.mutation(api.workflowGenerationExecutions.updateStatus, {
          executionId: generationExecutionId,
          status: "failed",
          error: result.error || "Failed to generate workflow",
        })

        logger.error("REST /generate/workflow", `Generation failed: ${result.error}`)
        res.status(400).json({
          success: false,
          error: result.error || "Failed to generate workflow",
          generationExecutionId,
        })
      }
    } catch (error) {
      // Update execution as failed if we have an execution ID
      if (generationExecutionId) {
        try {
          await client.mutation(api.workflowGenerationExecutions.updateStatus, {
            executionId: generationExecutionId,
            status: "failed",
            error: error instanceof Error ? error.message : "Internal server error during generation",
          })
        } catch (updateError) {
          logger.error("REST /generate/workflow", "Failed to update execution status", updateError)
        }
      }

      logger.error("REST /generate/workflow", "Unexpected error during generation", error)
      res.status(500).json({
        success: false,
        error: "Internal server error during generation",
        generationExecutionId,
      })
    }
  }),
)
