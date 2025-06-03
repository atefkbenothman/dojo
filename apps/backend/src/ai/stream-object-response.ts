import { type CoreMessage, type LanguageModel, NoObjectGeneratedError, streamObject } from "ai"
import { type Response } from "express"

interface StreamAiResponseOptions {
  res: Response
  languageModel: LanguageModel
  messages: CoreMessage[]
}

export async function streamObjectResponse(
  options: StreamAiResponseOptions & { end?: boolean } = { end: true } as any,
): Promise<{ object: any }> {
  const { res, languageModel, messages, end = true } = options

  try {
    const { fullStream, object } = streamObject({
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

    for await (const part of fullStream) {
      if (part.type === "text-delta") {
        res.write(encoder.encode(`0:${JSON.stringify(part.textDelta)}\n\n`))
      }
    }

    const finalObject = await object
    if (end && !res.writableEnded) {
      res.end()
    }
    return { object: finalObject }
  } catch (error) {
    console.error("[AI] Error during AI object stream processing:", error)
    if (!res.headersSent) {
      res.status(500).json({ message: "Error processing AI stream" })
    } else {
      if (!res.writableEnded) {
        res.end()
      }
    }
    return { object: null }
  }
}
