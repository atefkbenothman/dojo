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

interface ToolCall {
  toolCallId: string
  toolName: string
  args: unknown
}

interface ToolCallContent {
  type: "tool-call"
  toolCallId: string
  toolName: string
  args: unknown
}

interface StreamTextResult {
  text: string
  metadata?: {
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    toolCalls?: ToolCall[]
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

  // Set headers for Vercel AI SDK compatibility - must be before any write
  res.setHeader("Content-Type", "text/plain; charset=utf-8")
  res.setHeader("x-vercel-ai-data-stream", "v1")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  let capturedMetadata: StreamTextResult["metadata"] = {}
  let streamError: Error | null = null
  let hasErrored = false

  const result = streamText({
    model: languageModel,
    messages: messages,
    tools: tools,
    toolChoice: "auto",
    maxRetries: 5,
    maxSteps: 20,
    abortSignal,
    experimental_transform: smoothStream({
      delayInMs: 5,
      chunking: "line",
    }),
    onError: (error) => {
      logger.error("AI", "Error during AI text stream processing (onError callback)", error)
      // Capture the error to throw after streaming attempt
      streamError =
        error instanceof Error ? error : new Error(error instanceof Object ? JSON.stringify(error) : String(error))
      hasErrored = true
    },
    onFinish: ({ usage, finishReason, response }) => {
      // Only capture metadata if we haven't errored
      if (!hasErrored) {
        // Extract tool calls from assistant messages
        const toolCalls = response.messages
          .filter((msg) => msg.role === "assistant")
          .flatMap((msg) => {
            // Extract tool calls from the content array
            if (Array.isArray(msg.content)) {
              return msg.content.filter((content: any): content is ToolCallContent => 
                content.type === "tool-call"
              )
            }
            return []
          })
          .map((toolCall: ToolCallContent) => ({
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            args: toolCall.args,
          }))

        // Log tool calls for debugging
        if (toolCalls.length > 0) {
          logger.info("AI", `Captured ${toolCalls.length} tool calls:`, {
            toolNames: toolCalls.map(tc => tc.toolName),
          })
        }

        capturedMetadata = {
          usage: usage
            ? {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
              }
            : undefined,
          toolCalls,
          model: response.modelId || languageModel.modelId,
          finishReason: finishReason,
        }
      }
    },
  })

  try {
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

    // Check for errors before trying to get the text
    if (streamError) {
      logger.error("AI", "Throwing captured stream error before getting text", streamError)
      throw streamError as Error
    }

    const text = await result.text

    // Check again in case error occurred during text retrieval
    if (streamError) {
      logger.error("AI", "Throwing captured stream error after getting text", streamError)
      throw streamError as Error
    }

    return {
      text,
      metadata: capturedMetadata,
    }
  } catch (error) {
    logger.error("AI", "Error caught in streamTextResponse try-catch", {
      error,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
      hasStreamError: !!streamError,
    })

    // Ensure response is properly ended on error
    if (!res.writableEnded) {
      res.end()
    }

    // Re-throw the error so it propagates to WorkflowExecutor/AgentService
    throw error instanceof Error ? error : new Error(String(error))
  }
}
