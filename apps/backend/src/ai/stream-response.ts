import { smoothStream, type CoreMessage, streamText, type ToolSet, type LanguageModel } from "ai"
import { type Response } from "express"

// Polyfill for Node.js if not available globally
// Remove this if your environment already has ReadableStreamReadResult
type ReadableStreamReadResult<T> = { done: boolean; value?: T }

interface StreamAiResponseOptions {
  res: Response
  languageModel: LanguageModel
  messages: CoreMessage[]
  tools: ToolSet
  maxSteps?: number
}

export async function streamAiResponse(options: StreamAiResponseOptions): Promise<void> {
  const { res, languageModel, messages, tools, maxSteps } = options

  console.log(
    `[AI] Streaming AI response with ${messages.length} initial messages, ${Object.keys(tools).length} tools. Max steps: ${maxSteps ?? "default"}`,
  )

  try {
    const result = streamText({
      model: languageModel,
      messages: messages,
      tools: tools,
      maxSteps: maxSteps,
      experimental_transform: smoothStream({
        delayInMs: 5,
        chunking: "line",
      }),
      onError: (error) => {
        console.error("[AI] Error during AI stream processing:", error)
        if (!res.headersSent) {
          res.status(500).json({ message: "Error processing AI stream" })
        } else {
          res.end()
        }
      },
    })

    const responseStream = result.toDataStreamResponse()

    responseStream.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })
    res.status(responseStream.status)

    if (responseStream.body) {
      const reader = (responseStream.body as ReadableStream<Uint8Array>).getReader()
      try {
        while (true) {
          const { done, value }: ReadableStreamReadResult<Uint8Array> = await reader.read()
          if (done) {
            break
          }
          res.write(value)
        }
      } finally {
        reader.releaseLock()
      }
    }
    res.end()
  } catch (error) {
    console.error("[AI] Error during AI stream processing:", error)
    if (!res.headersSent) {
      res.status(500).json({ message: "Error processing AI stream" })
    } else {
      if (!res.writableEnded) {
        res.end()
      }
    }
  }
}
