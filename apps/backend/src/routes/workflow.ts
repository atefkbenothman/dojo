import { getModelInstance } from "../ai/get-model.js"
import { streamObjectResponse } from "../ai/stream-object-response.js"
import { streamTextResponse } from "../ai/stream-text-response.js"
import { getOrCreateUserSession } from "../core.js"
import { AgentConfigSchema, AI_MODELS, CoreMessageSchema } from "@dojo/config"
import type { AgentConfig } from "@dojo/config"
import { tryCatch } from "@dojo/utils"
import type { LanguageModel, ToolSet, CoreMessage } from "ai"
import "dotenv/config"
import express, { type Request, type Response, Router } from "express"
import { z } from "zod"

export const workflowRouter: Router = express.Router()

const workflowInputSchema = z.object({
  steps: z.array(AgentConfigSchema).min(1, { message: "Workflow must have at least one step" }),
  messages: z.array(CoreMessageSchema).min(1, { message: "Missing or invalid messages array" }),
  modelId: z.string(),
  apiKey: z.string().optional(),
})

workflowRouter.post("/run", async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = workflowInputSchema.safeParse(req.body)
    if (!validationResult.success) {
      res.status(400).json({ error: "Invalid input", details: validationResult.error.formErrors })
      return
    }

    const { steps: inputSteps, messages: initialMessages, modelId, apiKey: providedApiKey } = validationResult.data
    const steps = inputSteps as AgentConfig[]

    const userId = req.headers["x-user-id"] as string | undefined
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      res.status(401).json({ error: "User ID is missing or invalid in X-User-Id header." })
      return
    }

    const userSession = getOrCreateUserSession(userId)
    if (!userSession) {
      res.status(500).json({ error: "Failed to get or create user session." })
      return
    }

    let apiKeyToUse = providedApiKey
    if (!apiKeyToUse && AI_MODELS[modelId]?.requiresApiKey === false) {
      apiKeyToUse = process.env.GROQ_API_KEY_FALLBACK || ""
    }

    if (!apiKeyToUse) {
      res.status(400).json({ error: "Missing API key." })
      return
    }

    // Set headers ONCE at the start for streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8")
    res.setHeader("Transfer-Encoding", "chunked")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    const { data: modelInstance, error: modelError } = tryCatch(getModelInstance(modelId, apiKeyToUse))
    if (modelError || !modelInstance) {
      res.status(400).json({
        error: `Failed to initialize AI model '${modelId}'. Please check your API key and try again.`,
      })
      return
    }

    const aiModel = modelInstance as LanguageModel

    console.log(
      `[REST /workflow/run] request for userId: ${userSession.userId}, model: ${modelId}, steps: ${steps.length}`,
    )

    const combinedTools: ToolSet = {}
    if (userSession.activeMcpClients) {
      for (const mcpClient of userSession.activeMcpClients.values()) {
        const clientTools = mcpClient.client.tools || {}
        Object.assign(combinedTools, clientTools)
      }
      console.log(`[REST /workflow/run] Using ${Object.keys(combinedTools).length} total tools`)
    }

    let messages = [...initialMessages] as CoreMessage[]
    let completedSteps: { instructions: string; output?: string }[] = []
    const workflowPrompt = initialMessages.find((m) => m.role === "user")?.content || ""
    let lastStepOutput: string | undefined = undefined

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (!step) continue

      // Build COMPLETED STEPS section
      const completedStepsSection =
        completedSteps.length > 0
          ? completedSteps
              .map(
                (s, idx) => `Step ${idx + 1} Instructions: ${s.instructions}${s.output ? `\nOutput: ${s.output}` : ""}`,
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
        if (step.output.type === "text") {
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
            // res.write(JSON.stringify({ step: i + 1, output: text }) + "\n")
            console.log(`[REST /workflow/run] Messages after step ${i + 1}:`, JSON.stringify(messages, null, 2))
          }
        } else if (step.output.type === "object") {
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
            // res.write(JSON.stringify({ step: i + 1, output: objectContent }) + "\n")
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
})
