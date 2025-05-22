import { type YourPlanSchema } from "../agents/planner-agent.js"
import { type AgentInput, type AgentInternalOutput, type IAgent } from "../types.js"
import { streamText } from "ai"
import { type Response as ExpressResponse } from "express"

export class WorkerAgent implements IAgent<YourPlanSchema, void> {
  name = "WorkerAgent"
  description = "Executes tasks based on a provided plan, streaming text output and tool interactions."

  async execute(input: AgentInput<YourPlanSchema>, res: ExpressResponse): Promise<AgentInternalOutput<void>> {
    console.log(`[${this.name}] Starting execution with plan objective: ${input.previousAgentResult?.objective}`)
    const plan = input.previousAgentResult

    if (!plan) {
      const errorMessage = `[${this.name}] Critical error: No plan was provided to the WorkerAgent.`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }

    const systemPrompt = `You are an expert execution agent. Your task is to carry out the following plan step-by-step. Provide detailed output as you work through each step. Plan details:\nObjective: ${plan.objective}\nSteps:\n${plan.steps.map((step: string, index: number) => `${index + 1}. ${step}`).join("\n")}`

    const messages = [{ role: "system" as const, content: systemPrompt }, ...input.messages]

    try {
      const result = streamText({
        model: input.languageModel,
        messages: messages,
        tools: input.tools,
        maxSteps: 20,
        onError: (error) => {
          console.error(`[${this.name}] Error during AI stream processing:`, error)
          if (!res.headersSent) {
            res.status(500).json({ message: "Error processing AI stream from WorkerAgent" })
          } else {
            if (!res.writableEnded) {
              res.end()
            }
          }
        },
      })

      const dataStream = result.toDataStream()

      if (dataStream) {
        const reader = dataStream.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          res.write(value)
        }
      }

      if (!res.writableEnded) {
        res.end()
      }
    } catch (error) {
      console.error(`[${this.name}] Critical error during execution:`, error)
      if (!res.headersSent) {
        res.status(500).json({ message: "Critical error in WorkerAgent execution" })
      } else {
        if (!res.writableEnded) {
          res.end()
        }
      }
    }

    return { result: undefined }
  }
}
