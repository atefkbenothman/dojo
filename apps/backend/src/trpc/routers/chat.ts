import { getModelInstance } from "../../ai/get-model.js"
import { streamAiResponse } from "../../ai/stream-response.js"
import type { Context } from "../context.js"
import { chatInputSchema } from "../schemas.js"
import { protectedProcedure, router } from "../trpc.js"
import { AI_MODELS } from "@dojo/config"
import { TRPCError } from "@trpc/server"
import { type LanguageModel, type ToolSet, type CoreMessage } from "ai"
import "dotenv/config"
import { z } from "zod"

export const chatRouter = router({
  sendMessage: protectedProcedure
    .input(chatInputSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof chatInputSchema>; ctx: Context }) => {
      const { messages, modelId, apiKey: providedApiKey } = input
      const { userSession, res } = ctx

      let apiKey = providedApiKey

      if (!apiKey && AI_MODELS[modelId]?.requiresApiKey === false) {
        apiKey = process.env.GROQ_API_KEY_FALLBACK
      }

      if (!apiKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing API key.",
        })
      }

      let aiModel: LanguageModel
      try {
        aiModel = getModelInstance(modelId, apiKey) as LanguageModel
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "AI Model not configured on backend"
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errorMessage.includes("configured")
            ? errorMessage
            : `AI Model '${modelId}' not configured on backend or invalid API key.`,
        })
      }

      console.log(
        `[TRPC /chat.sendMessage] request received for userId: ${userSession!.userId}, using model: ${modelId}`,
      )

      const combinedTools: ToolSet = {}
      if (userSession!.activeMcpClients) {
        for (const mcpClient of userSession!.activeMcpClients.values()) {
          const clientTools = mcpClient.client.tools || {}
          Object.assign(combinedTools, clientTools)
        }
      }

      console.log(
        `[TRPC /chat.sendMessage]: Using ${Object.keys(combinedTools).length} total tools for userId: ${userSession!.userId}`,
      )

      await streamAiResponse({
        res,
        languageModel: aiModel,
        messages: messages as CoreMessage[],
        tools: combinedTools,
        maxSteps: 10,
      })

      // After streamAiResponse has called res.end(),
      // prevent tRPC from trying to end the response stream again.
      // Return a promise that never resolves to signal that the response is fully handled.
      return new Promise(() => {})
    }),
})

export type ChatRouter = typeof chatRouter
