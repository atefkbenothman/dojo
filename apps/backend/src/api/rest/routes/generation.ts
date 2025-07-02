import { asyncHandler } from "../../../lib/errors"
import { logger } from "../../../lib/logger"
import { generateAgent } from "../../../services/generation/agent-generator"
import { generateWorkflow } from "../../../services/generation/workflow-generator"
import { createValidatedRequestMiddleware } from "../middleware"
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
    // Session is guaranteed to exist due to middleware
    const session = req.session!
    
    // Check authentication
    if (!session.userId) {
      res.status(401).json({ 
        success: false, 
        error: "Authentication required to generate agents with AI" 
      })
      return
    }
    
    const parsedInput = req.parsedInput as z.infer<typeof generateAgentSchema>
    const { prompt, generation } = parsedInput
    const modelId = generation.modelId

    logger.info("REST /generate/agent", `Generation request from user: ${session.userId}`)

    try {
      // Extract the auth token from the authorization header
      const authToken = req.headers.authorization?.substring(7) || ''
      
      const result = await generateAgent({
        prompt,
        sessionId: session._id,
        modelId,
        authToken,
      })

      if (result.success) {
        logger.info("REST /generate/agent", `Successfully generated agent: ${result.agentId}`)
        res.json({ 
          success: true, 
          agentId: result.agentId 
        })
      } else {
        logger.error("REST /generate/agent", `Generation failed: ${result.error}`)
        res.status(400).json({ 
          success: false, 
          error: result.error || "Failed to generate agent" 
        })
      }
    } catch (error) {
      logger.error("REST /generate/agent", "Unexpected error during generation", error)
      res.status(500).json({ 
        success: false, 
        error: "Internal server error during generation" 
      })
    }
  })
)

// POST /api/generate/workflow
generationRouter.post(
  "/workflow",
  createValidatedRequestMiddleware(generateWorkflowSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Session is guaranteed to exist due to middleware
    const session = req.session!
    
    // Check authentication
    if (!session.userId) {
      res.status(401).json({ 
        success: false, 
        error: "Authentication required to generate workflows with AI" 
      })
      return
    }
    
    const parsedInput = req.parsedInput as z.infer<typeof generateWorkflowSchema>
    const { prompt, generation } = parsedInput
    const modelId = generation.modelId

    logger.info("REST /generate/workflow", `Generation request from user: ${session.userId}`)

    try {
      // Extract the auth token from the authorization header
      const authToken = req.headers.authorization?.substring(7) || ''
      
      const result = await generateWorkflow({
        prompt,
        sessionId: session._id,
        modelId,
        authToken,
      })

      if (result.success) {
        logger.info("REST /generate/workflow", `Successfully generated workflow: ${result.workflowId}`)
        res.json({ 
          success: true, 
          workflowId: result.workflowId 
        })
      } else {
        logger.error("REST /generate/workflow", `Generation failed: ${result.error}`)
        res.status(400).json({ 
          success: false, 
          error: result.error || "Failed to generate workflow" 
        })
      }
    } catch (error) {
      logger.error("REST /generate/workflow", "Unexpected error during generation", error)
      res.status(500).json({ 
        success: false, 
        error: "Internal server error during generation" 
      })
    }
  })
)