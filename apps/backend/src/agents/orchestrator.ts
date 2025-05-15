import { type Request, type Response } from "express"
import { type CoreMessage, type LanguageModel, type ToolSet } from "ai"
import { PlannerAgent } from "@/agents/planner-agent"
import { WorkerAgent } from "@/agents/worker-agent"

export async function handleAiChainRequest(
  req: Request,
  res: Response,
  languageModel: LanguageModel,
  initialMessages: CoreMessage[],
  commonTools: ToolSet,
) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8")
  res.setHeader("Transfer-Encoding", "chunked")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  try {
    const plannerAgent = new PlannerAgent()
    const plannerOutput = await plannerAgent.execute({ messages: initialMessages, languageModel }, res)
    const plan = plannerOutput.result

    if (plan) {
      const workerAgent = new WorkerAgent()
      await workerAgent.execute(
        {
          messages: initialMessages,
          languageModel,
          tools: commonTools,
          previousAgentResult: plan,
        },
        res,
      )
    }
  } catch (error) {
    console.error("[handleAiChainRequest] Error in AI agent chain:", error)
    if (!res.headersSent) {
      res.status(500).json({ message: "Error processing AI request", details: (error as Error).message })
      return
    }
  } finally {
    if (!res.writableEnded) {
      res.end()
    }
  }
}
