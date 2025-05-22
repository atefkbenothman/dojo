import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { AI_MODELS } from "@dojo/config"
import { type LanguageModel, type ImageModel, wrapLanguageModel, extractReasoningMiddleware } from "ai"

export function getModelInstance(modelId: string, apiKey: string): LanguageModel | ImageModel {
  const modelInfo = AI_MODELS[modelId]

  if (!modelInfo) throw new Error(`Model with id '${modelId}' not found in shared configuration.`)
  if (!apiKey) throw new Error(`API key is required for model '${modelId}'.`)

  const modelName = modelInfo.modelName

  if (modelInfo.type === "text") {
    switch (modelInfo.provider) {
      case "google":
        return wrapLanguageModel({
          model: createGoogleGenerativeAI({ apiKey })(modelName),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        })
      case "groq":
        return wrapLanguageModel({
          model: createGroq({ apiKey })(modelName),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        })
      default:
        throw new Error(`Unsupported provider '${modelInfo.provider}' for text model '${modelId}'.`)
    }
  } else if (modelInfo.type === "image") {
    switch (modelInfo.provider) {
      case "openai":
        return createOpenAI({ apiKey }).image(modelName)
      default:
        throw new Error(`Unsupported provider '${modelInfo.provider}' for image model '${modelId}'.`)
    }
  } else {
    throw new Error(`Unsupported model type for model '${modelId}'.`)
  }
}
