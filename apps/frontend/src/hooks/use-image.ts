"use client"

import { useAIModels } from "./use-ai-models"
import { useChatProvider } from "@/hooks/use-chat"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useTRPCClient } from "@/lib/trpc/context"
import { useImageStore } from "@/store/use-image-store"
import type { RouterOutputs } from "@dojo/backend/src/types"
import type { ImageGenerationInput } from "@dojo/backend/src/types"
import { AIModel } from "@dojo/db/convex/types"
import { useMutation } from "@tanstack/react-query"
import { nanoid } from "nanoid"
import { useCallback } from "react"

export function useImage() {
  const trpcClient = useTRPCClient()

  const { setIsImageGenerating } = useImageStore()

  const { play } = useSoundEffectContext()
  const { setChatError, setMessages } = useChatProvider()

  const imageGenerationMutationFn = useCallback(
    function imageGenerationMutationFn(data: ImageGenerationInput) {
      return trpcClient.image.generate.mutate(data)
    },
    [setChatError, trpcClient],
  )

  const mutation = useMutation<RouterOutputs["image"]["generate"], Error, ImageGenerationInput>({
    mutationFn: imageGenerationMutationFn,
    // onSuccess: (result) => {
    //   const imagesArr = result.images || []
    //   if (imagesArr.length > 0) {
    //     const imageData = {
    //       type: "generated_image",
    //       images: imagesArr.map((img) => {
    //         if ("base64" in img) return { base64: img.base64 }
    //         if ("url" in img) return { base64: img.url }
    //         return { base64: "" }
    //       }),
    //     }
    //     setMessages((prev) => [
    //       ...prev,
    //       {
    //         id: nanoid(),
    //         role: "assistant",
    //         content: imagesArr.length > 1 ? "Generated Images:" : "Generated Image:",
    //         images: imageData,
    //       },
    //     ])
    //   }
    //   play("./sounds/done.mp3", { volume: 0.5 })
    //   setIsImageGenerating(false)
    // },
    // onError: (error: Error) => {
    //   play("./sounds/error.mp3", { volume: 0.5 })
    //   const message = error.message || "An unexpected error occurred during image generation."
    //   setChatError(message)
    //   setIsImageGenerating(false)
    //   console.error("Image generation mutation error:", error)
    // },
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
      setIsImageGenerating(true)
      mutation.mutate({
        modelId: selectedModel._id,
        prompt,
      })
    },
    [setMessages, play, mutation, setIsImageGenerating],
  )

  return { handleImageGeneration }
}
