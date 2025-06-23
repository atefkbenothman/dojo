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

  try {
    let capturedMetadata: StreamObjectResult["metadata"] = {}

    const result = streamObject({
      model: languageModel,
      messages,
      output: "no-schema",
      mode: "json",
      abortSignal,
      onError: (err) => {
        logger.error("AI", "Error during AI object stream processing", err)
        if (!res.headersSent) {
          res.status(500).json({ message: "Error processing AI stream" })
        } else {
          res.end()
        }
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
    return {
      object,
      metadata: capturedMetadata,
    }
  } catch (error) {
    logger.error("AI", "Error during AI object stream processing", error)
    if (!res.headersSent) {
      res.status(500).json({ message: "Error processing AI stream" })
    } else {
      if (!res.writableEnded) {
        res.end()
      }
    }

    return {
      object: null,
      metadata: undefined,
    }
  }
}
