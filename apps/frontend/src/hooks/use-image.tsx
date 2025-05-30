"use client"

import { useChatProvider } from "@/hooks/use-chat"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useTRPCClient } from "@/lib/trpc/context"
import { getApiKeyForModel } from "@/lib/utils"
import type { RouterOutputs } from "@dojo/backend/src/types"
import type { ImageGenerationInput } from "@dojo/backend/src/types"
import type { AIModel } from "@dojo/config"
import { useMutation } from "@tanstack/react-query"
import { nanoid } from "nanoid"
import { createContext, useContext, useState, useCallback } from "react"

function useImage() {
  const trpcClient = useTRPCClient()
  const { play } = useSoundEffectContext()
  const { setChatError, setMessages } = useChatProvider()

  const [isImageGenerating, setIsImageGenerating] = useState(false)

  const imageGenerationMutationFn = useCallback(
    function imageGenerationMutationFn(data: ImageGenerationInput) {
      if (!data.apiKey) {
        const errorMsg = `API key for image generation with model ${data.modelId} not provided.`
        setChatError(errorMsg)
        throw new Error(errorMsg)
      }
      return trpcClient.image.generate.mutate(data)
    },
    [setChatError, trpcClient],
  )

  const mutation = useMutation<RouterOutputs["image"]["generate"], Error, ImageGenerationInput>({
    mutationFn: imageGenerationMutationFn,
    onSuccess: (result) => {
      const imagesArr = result.images || []
      if (imagesArr.length > 0) {
        const imageData = {
          type: "generated_image",
          images: imagesArr.map((img) => {
            if ("base64" in img) return { base64: img.base64 }
            if ("url" in img) return { base64: img.url }
            return { base64: "" }
          }),
        }
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "assistant",
            content: imagesArr.length > 1 ? "Generated Images:" : "Generated Image:",
            images: imageData,
          },
        ])
      }
      play("./sounds/done.mp3", { volume: 0.5 })
      setIsImageGenerating(false)
    },
    onError: (error: Error) => {
      play("./sounds/error.mp3", { volume: 0.5 })
      const message = error.message || "An unexpected error occurred during image generation."
      setChatError(message)
      setIsImageGenerating(false)
      console.error("Image generation mutation error:", error)
    },
  })

  const handleImageGeneration = useCallback(
    async function handleImageGeneration({ message, selectedModel }: { message: string; selectedModel: AIModel }) {
      if (selectedModel.type !== "image") return
      const prompt = message.trim()
      play("./sounds/chat.mp3", { volume: 0.5 })
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "user",
          content: prompt,
        },
      ])
      const apiKey = getApiKeyForModel(selectedModel)
      if (!apiKey) {
        setChatError(`API key for ${selectedModel.name} is not configured.`)
        play("./sounds/error.mp3", { volume: 0.5 })
        return
      }
      setIsImageGenerating(true)
      mutation.mutate({
        modelId: selectedModel.id,
        prompt,
        apiKey,
      })
    },
    [setMessages, setChatError, play, mutation],
  )

  return {
    imageMutation: mutation,
    handleImageGeneration,
    isImageGenerating,
  }
}

type AIImageContextType = ReturnType<typeof useImage>

const AIImageContext = createContext<AIImageContextType | undefined>(undefined)

type AIImageProviderProps = {
  children: React.ReactNode
}

export function useImageProvider() {
  const context = useContext(AIImageContext)
  if (!context) {
    throw new Error("useImageProvider must be used within an AIImageProvider")
  }
  return context
}

export function AIImageProvider({ children }: AIImageProviderProps) {
  const imageState = useImage()
  return <AIImageContext.Provider value={imageState}>{children}</AIImageContext.Provider>
}
