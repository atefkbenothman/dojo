import { smoothStream, type CoreMessage, streamText, type ToolSet, type LanguageModel, streamObject } from "ai"
import { type Response } from "express"

// Polyfill for Node.js if not available globally
// Remove this if your environment already has ReadableStreamReadResult
type ReadableStreamReadResult<T> = { done: boolean; value?: T }

interface StreamAiResponseOptions {
  res: Response
  languageModel: LanguageModel
  messages: CoreMessage[]
  tools: ToolSet
}

export async function streamTextResponse(options: StreamAiResponseOptions): Promise<{ text: string }> {
  const { res, languageModel, messages, tools } = options

  console.log(
    `[AI] Streaming AI response with ${messages.length} initial messages, ${Object.keys(tools).length} tools.`,
  )

  try {
    const result = streamText({
      model: languageModel,
      messages: messages,
      tools: tools,
      maxSteps: 10,
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

    const responseStream = result.toDataStream()

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

    if (!res.writableEnded) {
      res.end()
    }

    const finalText = await result.text
    console.log("------------ ")
    console.log("[stream-text-response] finalText", finalText)
    console.log("------------ ")
    return { text: finalText }
  } catch (error) {
    console.error("[AI] Error during AI stream processing:", error)
    if (!res.headersSent) {
      res.status(500).json({ message: "Error processing AI stream" })
    } else {
      if (!res.writableEnded) {
        res.end()
      }
    }
    return { text: "" }
  }
}
