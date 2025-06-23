import { logger } from "../../lib/logger"
import { smoothStream, type CoreMessage, streamText, type ToolSet, type LanguageModel } from "ai"
import { type Response } from "express"

interface StreamTextOptions {
  res: Response
  languageModel: LanguageModel
  messages: CoreMessage[]
  tools: ToolSet
  end?: boolean
  abortSignal?: AbortSignal
}

interface StreamTextResult {
  text: string
  metadata?: {
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    toolCalls?: Array<{
      toolCallId: string
      toolName: string
      args: any
    }>
    model?: string
    finishReason?: string
  }
}

export async function streamTextResponse(options: StreamTextOptions): Promise<StreamTextResult> {
  const { res, languageModel, messages, tools, end = true, abortSignal } = options

  logger.info(
    "AI",
    `Streaming AI response with ${messages.length} initial messages, ${Object.keys(tools).length} tools`,
  )

  let capturedMetadata: StreamTextResult["metadata"] = {}

  const result = streamText({
    model: languageModel,
    messages: messages,
    tools: tools,
    maxSteps: 20,
    abortSignal,
    experimental_transform: smoothStream({
      delayInMs: 5,
      chunking: "line",
    }),
    onError: (error) => {
      logger.error("AI", "Error during AI text stream processing", error)
    },
    onFinish: ({ usage, finishReason, response }) => {
      // Capture metadata when streaming completes
      capturedMetadata = {
        usage: usage
          ? {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            }
          : undefined,
        toolCalls: response.messages
          .filter((msg): msg is any => msg.role === "assistant" && "toolInvocations" in msg)
          .flatMap((msg) => msg.toolInvocations || [])
          .map((toolInvocation: any) => ({
            toolCallId: toolInvocation.toolCallId,
            toolName: toolInvocation.toolName,
            args: toolInvocation.args,
          })),
        model: response.modelId || languageModel.modelId,
        finishReason: finishReason,
      }

      logger.info("AI", "Stream completed with metadata", {
        usage: capturedMetadata.usage,
        toolCallCount: capturedMetadata.toolCalls?.length || 0,
        model: capturedMetadata.model,
        finishReason: capturedMetadata.finishReason,
      })
    },
  })

  const responseStream = result.toDataStream({ sendReasoning: true })

  if (responseStream) {
    const reader = responseStream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      res.write(value)
    }
  }

  if (end && !res.writableEnded) {
    res.end()
  }

  const text = await result.text

  return {
    text,
    metadata: capturedMetadata,
  }
}
