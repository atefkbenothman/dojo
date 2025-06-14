import { convex } from "../convex-client.js"
import { aggregateMcpTools } from "../mcp-connection.js"
import { WorkflowExecutor, logWorkflow } from "../workflow/workflow-executor.js"
import { createAiRequestMiddleware } from "./middleware.js"
import { api } from "@dojo/db/convex/_generated/api.js"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel.js"
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
    try {
      const session = req.session
      const aiModel = req.aiModel as LanguageModel
      const parsedInput = req.parsedInput as z.infer<typeof workflowInputSchema>

      const { messages: initialMessages, workflow: workflowInfo } = parsedInput

      // Fetch workflow
      const workflow = await convex.query(api.workflows.get, { id: workflowInfo.workflowId as Id<"workflows"> })
      if (!workflow) {
        res.status(404).json({ error: `Workflow with id ${workflowInfo.workflowId} not found.` })
        return
      }

      // Fetch all agents (steps) for the workflow
      const agentDocs = await Promise.all(
        workflow.steps.map((agentId: Id<"agents">) => convex.query(api.agents.get, { id: agentId })),
      )

      const steps = agentDocs.filter((agent: Doc<"agents"> | null) => agent !== null)
      if (steps.length !== workflow.steps.length) {
        logWorkflow(`WARNING: Some agents for workflow ${workflow._id} were not found.`)
      }

      if (steps.length === 0) {
        res.status(400).json({ error: "Workflow has no valid steps." })
        return
      }

      // Prepare execution context
      const userIdForLogging = session?.userId || "anonymous"
      const combinedTools = session ? aggregateMcpTools(session._id) : {}

      logWorkflow(
        `Starting workflow request for userId: ${userIdForLogging}, model: ${workflowInfo.modelId}, steps: ${steps.length}`,
      )

      if (session?.activeMcpServerIds) {
        logWorkflow(`Using ${Object.keys(combinedTools).length} total tools`)
      }

      // Create and execute workflow
      const executor = new WorkflowExecutor(workflow, steps, aiModel, combinedTools, res, {
        maxRetries: 3,
        retryDelay: 1000,
        persistExecution: false, // TODO: Implement persistence
      })

      const result = await executor.execute(initialMessages as CoreMessage[])

      // The executor handles all streaming and response ending
      // Just log the final result
      if (result.success) {
        logWorkflow(`Workflow completed successfully with ${result.completedSteps.length} steps`)
      } else {
        logWorkflow(`Workflow failed: ${result.error}`)
      }
    } catch (error) {
      logWorkflow("Unhandled error in workflow route:", error)
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" })
      } else if (!res.writableEnded) {
        res.end()
      }
    }
  },
)
