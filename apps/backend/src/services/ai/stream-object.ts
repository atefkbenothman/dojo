import { logger } from "../../lib/logger"
import { type CoreMessage, type LanguageModel, streamObject } from "ai"
import { type Response } from "express"

interface StreamObjectOptions {
  res: Response
  languageModel: LanguageModel
  messages: CoreMessage[]
  end?: boolean
  abortSignal?: AbortSignal
}

interface StreamObjectResult {
  object: unknown
  metadata?: {
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    model?: string
    finishReason?: string
  }
}

export async function streamObjectResponse(options: StreamObjectOptions): Promise<StreamObjectResult> {
  const { res, languageModel, messages, end = true, abortSignal } = options

  let capturedMetadata: StreamObjectResult["metadata"] = {}
  let streamError: Error | null = null

  const result = streamObject({
    model: languageModel,
    messages,
    output: "no-schema",
    mode: "json",
    abortSignal,
    onError: (err) => {
      logger.error("AI", "Error during AI object stream processing", err)
      // Capture the error to throw after streaming attempt
      streamError = err instanceof Error ? err : new Error(String(err))
    },
    onFinish: ({ usage, response }) => {
      // Capture metadata when streaming completes
      capturedMetadata = {
        usage: usage
          ? {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            }
          : undefined,
        model: response.modelId || languageModel.modelId,
      }

      logger.info("AI", "Object stream completed with metadata", {
        usage: capturedMetadata.usage,
        model: capturedMetadata.model,
      })
    },
  })

  try {
    const encoder = new TextEncoder()

    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        res.write(encoder.encode(`0:${JSON.stringify(part.textDelta)}\n\n`))
      }
    }

    if (end && !res.writableEnded) {
      res.end()
    }

    // Return the complete object with metadata
    const object = await result.object

    // If an error occurred during streaming, throw it now
    if (streamError) {
      throw streamError
    }

    return {
      object,
      metadata: capturedMetadata,
    }
  } catch (error) {
    logger.error("AI", "Error during AI object stream processing", error)

    // Ensure response is properly ended on error
    if (!res.writableEnded) {
      res.end()
    }

    // Re-throw the error so it propagates to WorkflowExecutor/AgentService
    throw error
  }
}
