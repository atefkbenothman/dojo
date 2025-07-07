import { asyncHandler, throwError } from "../../../lib/errors"
import { logger } from "../../../lib/logger"
import { modelManager } from "../../../services/ai/model-manager"
import { streamTextResponse } from "../../../services/ai/stream-text"
import { mcpConnectionManager } from "../../../services/mcp/connection-manager"
import { agentService } from "../../../services/agent/agent"
import { workflowService } from "../../../services/workflow/workflow"
import { createValidatedRequestMiddleware } from "../middleware"
import type { LanguageModel, CoreMessage } from "ai"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const chatRouter: Router = express.Router()

// Unified schema that handles all types
const unifiedChatSchema = z.object({
  messages: z.array(z.any()),
  type: z.enum(["chat", "agent", "workflow"]).optional().default("chat"),
  // Chat-specific
  modelId: z.string().optional(),
  // Agent-specific
  agentId: z.string().optional(),
  // Workflow-specific
  workflow: z.object({
    workflowId: z.string(),
    modelId: z.string().optional(),
  }).optional(),
}).refine(
  (data) => {
    // Validate based on type
    if (data.type === "chat") {
      return !!data.modelId && data.messages.length > 0
    }
    if (data.type === "agent") {
      return !!data.agentId
    }
    if (data.type === "workflow") {
      return !!data.workflow?.workflowId
    }
    return false
  },
  {
    message: "Invalid request: missing required fields for the specified type",
  }
)

// Handler functions for each type
async function handleDirectChat(
  req: Request,
  res: Response,
  messages: CoreMessage[],
  modelId: string
): Promise<void> {
  const { session, client } = req

  logger.info(
    "REST /chat (type: chat)",
    `request received for userId: ${session.userId?.slice(0, 5)}, using model: ${modelId}`,
  )

  const modelInstance = await modelManager.getModel(modelId, client)
  const aiModel = modelInstance as LanguageModel
  const combinedTools = mcpConnectionManager.aggregateTools(session._id)

  logger.info(
    "REST /chat (type: chat)",
    `Using ${Object.keys(combinedTools).length} total tools for userId: ${session.userId?.slice(0, 5)}`,
  )

  await streamTextResponse({
    res,
    languageModel: aiModel,
    messages,
    tools: combinedTools,
  })
}

async function handleAgentChat(
  req: Request,
  res: Response,
  messages: CoreMessage[],
  agentId: string
): Promise<void> {
  const { session, client } = req

  logger.info(
    "REST /chat (type: agent)",
    `request received for userId: ${session.userId || "anonymous"}, agent: ${agentId}`,
  )

  const result = await agentService.runAgent({
    agentId,
    messages,
    session,
    res,
    client,
  })

  if (!result.success) {
    if (result.error?.includes("not found")) {
      throwError(`Agent with id '${agentId}' not found`, 404)
    }
    throw new Error(result.error || "Internal server error")
  }
}

async function handleWorkflowChat(
  req: Request,
  res: Response,
  messages: CoreMessage[],
  workflowInfo: { workflowId: string; modelId?: string }
): Promise<void> {
  const { session, client } = req

  logger.info(
    "REST /chat (type: workflow)",
    `request received for userId: ${session.userId || "anonymous"}, workflow: ${workflowInfo.workflowId}`,
  )

  const result = await workflowService.runWorkflow({
    workflowId: workflowInfo.workflowId,
    messages,
    session,
    res,
    client,
  })

  if (!result.success) {
    if (result.error?.includes("not found")) {
      throwError(`Workflow with id '${workflowInfo.workflowId}' not found`, 404)
    }
    if (result.error?.includes("no valid steps")) {
      throwError("Workflow has no valid steps", 400)
    }
    throw new Error(result.error || "Internal server error")
  }
}

// Main unified endpoint
chatRouter.post(
  "/",
  createValidatedRequestMiddleware(unifiedChatSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsedInput = req.parsedInput as z.infer<typeof unifiedChatSchema>
    const { messages, type } = parsedInput

    switch (type) {
      case "chat":
        await handleDirectChat(req, res, messages as CoreMessage[], parsedInput.modelId!)
        break
      case "agent":
        await handleAgentChat(req, res, messages as CoreMessage[], parsedInput.agentId!)
        break
      case "workflow":
        await handleWorkflowChat(req, res, messages as CoreMessage[], parsedInput.workflow!)
        break
      default:
        throwError("Invalid request type", 400)
    }
  }),
)
