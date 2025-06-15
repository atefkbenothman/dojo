import { workflowService } from "../../../services/workflow/workflow"
import { createAiRequestMiddleware } from "../middleware"
import type { CoreMessage, LanguageModel } from "ai"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const workflowRouter: Router = express.Router()

const workflowInputSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.string(),
          content: z.unknown(),
        })
        .passthrough(),
    )
    .min(1, { message: "Missing or invalid messages array" }),
  workflow: z.object({
    modelId: z.string(),
    workflowId: z.string(),
  }),
})

workflowRouter.post(
  "/run",
  createAiRequestMiddleware(workflowInputSchema),
  async (req: Request, res: Response): Promise<void> => {
    const session = req.session
    const aiModel = req.aiModel as LanguageModel
    const parsedInput = req.parsedInput as z.infer<typeof workflowInputSchema>
    const { messages, workflow: workflowInfo } = parsedInput

    console.log(
      `[REST /workflow/run] request received for userId: ${session?.userId || "anonymous"}, using model: ${workflowInfo.modelId}`,
    )

    const result = await workflowService.runWorkflow({
      workflowId: workflowInfo.workflowId,
      messages: messages as CoreMessage[],
      session,
      aiModel,
      res,
    })

    if (!result.success) {
      if (!res.headersSent) {
        const statusCode = result.error?.includes("not found")
          ? 404
          : result.error?.includes("no valid steps")
            ? 400
            : 500
        res.status(statusCode).json({ error: result.error || "Internal server error" })
      } else if (!res.writableEnded) {
        res.end()
      }
    }
    // Note: The WorkflowExecutor handles streaming responses and ending the response
    // So we don't need to do anything here for successful executions
  },
)
