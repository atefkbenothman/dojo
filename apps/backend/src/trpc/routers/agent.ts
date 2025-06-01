import { getModelInstance } from "../../ai/get-model.js"
import { streamAiResponse } from "../../ai/stream-response.js"
import type { Context } from "../context.js"
import { protectedProcedure, router } from "../trpc.js"
import { AgentConfigSchema, CoreMessageSchema } from "@dojo/config"
import { tryCatch } from "@dojo/utils"
import { TRPCError } from "@trpc/server"
import { type LanguageModel, type ToolSet, type CoreMessage } from "ai"
import "dotenv/config"
import { z } from "zod"

const agentInputSchema = z.object({
  messages: z.array(CoreMessageSchema).min(1, { message: "Missing or invalid messages array" }),
  apiKey: z.string(),
  config: AgentConfigSchema,
})

export const agentRouter = router({
  run: protectedProcedure
    .input(agentInputSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof agentInputSchema>; ctx: Context }) => {
      const { userSession, res } = ctx
      const { messages, config, apiKey } = input

      const modelId = config.aiModelId

      const { data: aiModel, error: modelError } = tryCatch(getModelInstance(modelId, apiKey) as LanguageModel)
      if (modelError) {
        const errorMessage = modelError instanceof Error ? modelError.message : "AI Model not configured on backend"
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errorMessage.includes("configured")
            ? errorMessage
            : `AI Model '${modelId}' not configured on backend or invalid API key.`,
        })
      }

      console.log(`[TRPC /agent.run] request received for userId: ${userSession!.userId}, using model: ${modelId}`)

      const combinedTools: ToolSet = {}
      if (userSession!.activeMcpClients) {
        for (const mcpClient of userSession!.activeMcpClients.values()) {
          const clientTools = mcpClient.client.tools || {}
          Object.assign(combinedTools, clientTools)
        }
      }

      console.log(
        `[TRPC /agent.run]: Using ${Object.keys(combinedTools).length} total tools for userId: ${userSession!.userId}`,
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
