import { CoreMessage, LanguageModel, streamText, experimental_generateImage as generateImage } from "ai"
import { GenerateImageOptions } from "./types"
import { AVAILABLE_IMAGE_MODELS, DEFAULT_IMAGE_MODEL_ID } from "./config"

export async function directChat(model: LanguageModel, messages: CoreMessage[]): Promise<Response> {
  console.log(`[MCP Core] directChat: Using direct AI call for ${messages.length} messages`)

  const result = await streamText({
    model: model,
    messages: messages,
  })

  return result.toDataStreamResponse()
}

export async function imageChat(
  modelId: string,
  prompt: string,
  options: GenerateImageOptions = {},
): Promise<{ images?: { base64: string }[]; error?: string }> {
  console.log(`[MCP Core] imageChat: Using direct AI call for ${prompt}`)

  const aiModel = AVAILABLE_IMAGE_MODELS[modelId] ?? AVAILABLE_IMAGE_MODELS[DEFAULT_IMAGE_MODEL_ID]

  const { images } = await generateImage({
    model: aiModel.imageModel,
    prompt: prompt,
    n: options.n,
  })

  const resultImages = images.map((img) => ({ base64: img.base64 }))

  return { images: resultImages }
}
