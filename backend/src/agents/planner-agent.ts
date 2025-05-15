import { streamObject, type LanguageModel } from "ai"
import { type Response as ExpressResponse } from "express"
import { type AgentInput, type AgentInternalOutput, type IAgent } from "./types"
import { z } from "zod"
import { TextEncoder } from "util"

export const PlanSchema = z.object({
  objective: z.string().describe("The overall objective of the plan."),
  steps: z.array(z.string()).describe("A list of detailed steps to achieve the objective."),
  // Consider adding fields like: requiredTools, successCriteria
})
export type YourPlanSchema = z.infer<typeof PlanSchema>

export class PlannerAgent implements IAgent<any, YourPlanSchema> {
  name = "PlannerAgent"
  description = "Generates a structured plan and streams its JSON string representation as text deltas."

  async execute(input: AgentInput, res: ExpressResponse): Promise<AgentInternalOutput<YourPlanSchema>> {
    console.log(`[${this.name}] Starting execution`)
    const encoder = new TextEncoder()

    const streamObjectPayload = {
      model: input.languageModel,
      schema: PlanSchema,
      prompt: input.messages.map((m) => m.content).join("\n\n"),
      system:
        "You are an expert planning assistant. Analyze the user's request and formulate a detailed, step-by-step plan. The plan should be structured according to the provided schema.",
    }

    const { fullStream, object: finalPlanPromise } = streamObject(streamObjectPayload)

    try {
      for await (const part of fullStream) {
        if (part.type === "text-delta") {
          res.write(encoder.encode(`0:${JSON.stringify(part.textDelta)}\n\n`))
        }
      }

      const finalPlan = await finalPlanPromise

      const finishPayload = {
        finishReason: "stop" as const,
        usage: { promptTokens: 0, completionTokens: 0 },
      }
      res.write(encoder.encode(`d:${JSON.stringify(finishPayload)}\n\n`))

      console.log(`[${this.name}] Successfully streamed plan as text deltas. Objective: ${finalPlan.objective}`)
      return { result: finalPlan }
    } catch (error) {
      console.error(`[${this.name}] Error during plan text streaming:`, error)
      if (!res.writableEnded) {
        const errorMsg = `Error processing plan: ${error}`
        res.write(encoder.encode(`0:${JSON.stringify(errorMsg)}\n`))

        const finishErrorPayload = {
          finishReason: "error",
          usage: { promptTokens: 0, completionTokens: 0 },
        }
        res.write(encoder.encode(`d:${JSON.stringify(finishErrorPayload)}\n`))
      }
      throw error
    }
  }
}
