import { streamObjectResponse } from "../ai/stream-object-response.js"
import { streamTextResponse } from "../ai/stream-text-response.js"
import { convex } from "../convex-client.js"
import { aggregateMcpTools } from "../mcp-connection.js"
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

      const workflow = await convex.query(api.workflows.get, { id: workflowInfo.workflowId as Id<"workflows"> })
      if (!workflow) {
        res.status(404).json({ error: `Workflow with id ${workflowInfo.workflowId} not found.` })
        return
      }

      const agentDocs = await Promise.all(
        workflow.steps.map((agentId: Id<"agents">) => convex.query(api.agents.get, { id: agentId })),
      )

      const steps = agentDocs.filter((agent: Doc<"agents"> | null) => agent !== null)
      if (steps.length !== workflow.steps.length) {
        console.warn(`[REST /workflow/run] Some agents for workflow ${workflow._id} were not found.`)
      }

      const userIdForLogging = session?.userId || "anonymous"
      const combinedTools = session ? aggregateMcpTools(session._id) : {}

      // Set headers ONCE at the start for streaming
      res.setHeader("Content-Type", "text/plain; charset=utf-8")
      res.setHeader("Transfer-Encoding", "chunked")
      res.setHeader("Cache-Control", "no-cache")
      res.setHeader("Connection", "keep-alive")

      console.log(
        `[REST /workflow/run] request for userId: ${userIdForLogging}, model: ${workflowInfo.modelId}, steps: ${steps.length}`,
      )

      if (session?.activeMcpServerIds) {
        console.log(`[REST /workflow/run] Using ${Object.keys(combinedTools).length} total tools`)
      }

      let messages: CoreMessage[] = initialMessages as CoreMessage[]
      const completedSteps: { instructions: string; output?: string }[] = []
      const workflowPromptMessage = messages.find((m) => m.role === "user")
      const workflowPrompt =
        typeof workflowPromptMessage?.content === "string"
          ? workflowPromptMessage.content
          : JSON.stringify(workflowPromptMessage?.content) || ""
      let lastStepOutput: string | undefined = undefined

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        if (!step) continue

        // Build COMPLETED STEPS section
        const completedStepsSection =
          completedSteps.length > 0
            ? completedSteps
                .map(
                  (s, idx) =>
                    `Step ${idx + 1} Instructions: ${s.instructions}${s.output ? `\nOutput: ${s.output}` : ""}`,
                )
                .join("\n\n")
            : "None"

        // Build system prompt with clear sections
        const systemPrompt =
          `=== WORKFLOW CONTEXT ===\n${workflowPrompt}\n\n` +
          `=== COMPLETED STEPS ===\n${completedStepsSection}\n\n` +
          `=== CURRENT STEP ===\nStep ${i + 1}: ${step.name || ""}\nInstructions: ${step.systemPrompt}`

        const systemMessage = { role: "system" as const, content: systemPrompt }

        // Build the user message for this step
        let userMessage: CoreMessage
        if (i === 0) {
          userMessage = { role: "user", content: workflowPrompt }
        } else {
          userMessage = {
            role: "user",
            content: `Output from previous step:\n${lastStepOutput || "No output from previous step."}`,
          }
        }

        // Only keep user/assistant messages from previous steps that are relevant (exclude system and non-informative assistant messages)
        const conversationHistory = messages.filter(
          (m) =>
            m.role !== "system" &&
            typeof m.content === "string" &&
            !m.content.startsWith("Starting workflow") &&
            m.content.trim() !== "",
        )
        const currentStepMessages: CoreMessage[] = [systemMessage, userMessage]

        console.log(`[REST /workflow/run] System message for step ${i + 1}:`, JSON.stringify(systemMessage))
        console.log(`[REST /workflow/run] User message for step ${i + 1}:`, JSON.stringify(userMessage))
        console.log(
          `[REST /workflow/run] Messages sent to AI for step ${i + 1}:`,
          JSON.stringify(currentStepMessages, null, 2),
        )

        let stepOutput: string | undefined = undefined
        try {
          if (step.outputType === "text") {
            const { text } = await streamTextResponse({
              res,
              languageModel: aiModel,
              messages: currentStepMessages,
              tools: combinedTools,
              end: false,
            })
            console.log(`[REST /workflow/run] AI text response for step ${i + 1}:`, JSON.stringify(text))
            if (!text || text.trim() === "") {
              console.warn(
                `[REST /workflow/run] WARNING: Empty text response at step ${i + 1} (not appending to messages)`,
              )
            } else {
              stepOutput = text
              lastStepOutput = text
              messages = [...conversationHistory, { role: "assistant" as const, content: text }]
              console.log(`[REST /workflow/run] Messages after step ${i + 1}:`, JSON.stringify(messages, null, 2))
            }
          } else if (step.outputType === "object") {
            const { object } = await streamObjectResponse({
              res,
              languageModel: aiModel,
              messages: currentStepMessages,
              end: false,
            })
            const objectContent = JSON.stringify(object)
            console.log(`[REST /workflow/run] AI object response for step ${i + 1}:`, objectContent)
            if (!objectContent || objectContent === "null") {
              console.warn(
                `[REST /workflow/run] WARNING: Empty object response at step ${i + 1} (not appending to messages)`,
              )
            } else {
              stepOutput = objectContent
              lastStepOutput = objectContent
              messages = [...conversationHistory, { role: "assistant" as const, content: objectContent }]
              console.log(`[REST /workflow/run] Messages after step ${i + 1}:`, JSON.stringify(messages, null, 2))
            }
          }
        } catch (err) {
          console.error(`[REST /workflow/run] Error during streaming for step ${i + 1}:`, err)
          if (!res.writableEnded) {
            res.end()
          }
          return
        }

        // Add this step to completedSteps for the next iteration
        completedSteps.push({ instructions: step.systemPrompt, output: stepOutput })
      }

      if (!res.writableEnded) {
        res.end()
      }
      console.log("[REST /workflow/run] All steps complete. Stream closed.")
    } catch (error) {
      console.error("[REST /workflow/run] Unhandled error:", error)
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" })
      } else if (!res.writableEnded) {
        res.end()
      }
    }
  },
)
