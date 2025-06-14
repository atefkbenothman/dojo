import { type CoreMessage, type LanguageModel, streamObject } from "ai"
import { type Response } from "express"

interface StreamObjectOptions {
  res: Response
  languageModel: LanguageModel
  messages: CoreMessage[]
  end?: boolean
  returnObject?: boolean
}

export async function streamObjectResponse(options: StreamObjectOptions): Promise<unknown | void> {
  const { res, languageModel, messages, end = true, returnObject = false } = options

  try {
    const result = streamObject({
      model: languageModel,
      messages,
      output: "no-schema",
      mode: "json",
      onError: (err) => {
        console.error("[AI] Error during AI object stream processing:", err)
        if (!res.headersSent) {
          res.status(500).json({ message: "Error processing AI stream" })
        } else {
          res.end()
        }
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

    if (returnObject) {
      return await result.object
    }
  } catch (error) {
    console.error("[AI] Error during AI object stream processing:", error)
    if (!res.headersSent) {
      res.status(500).json({ message: "Error processing AI stream" })
    } else {
      if (!res.writableEnded) {
        res.end()
      }
    }

    if (returnObject) {
      return null
    }
  }
}
