"use client"

// import { useAIModels } from "./use-ai-models"
import { useChat } from "@/hooks/use-chat"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useTRPCClient } from "@/lib/trpc/context"
import { useImageStore } from "@/store/use-image-store"
import type { RouterOutputs, ImageGenerationInput } from "@dojo/backend/src/lib/types"
// import { api } from "@dojo/db/convex/_generated/api"
// import { Id } from "@dojo/db/convex/_generated/dataModel"
import { AIModel } from "@dojo/db/convex/types"
import { useMutation } from "@tanstack/react-query"
// import { ConvexError } from "convex/values"
import { nanoid } from "nanoid"
import { useCallback } from "react"

export function useImage() {
  const trpcClient = useTRPCClient()

  const { setIsImageGenerating } = useImageStore()

  const { play } = useSoundEffectContext()
  const { setMessages, setChatError } = useChat()

  const imageGenerationMutationFn = useCallback(
    function imageGenerationMutationFn(data: ImageGenerationInput) {
      return trpcClient.image.generate.mutate(data)
    },
    [trpcClient],
  )

  const mutation = useMutation<RouterOutputs["image"]["generate"], Error, ImageGenerationInput>({
    mutationFn: imageGenerationMutationFn,
    onSuccess: () => {
      // Image generation is currently disabled in the backend
      // When re-enabled, uncomment the following:
      // const imagesArr = result?.images || []
      // if (imagesArr.length > 0) {
      //   const imageData = {
      //     type: "generated_image" as const,
      //     images: imagesArr.map((img: { base64?: string; url?: string }) => {
      //       if ("base64" in img) return { base64: img.base64 }
      //       if ("url" in img) return { base64: img.url }
      //       return { base64: "" }
      //     }),
      //   }
      //   setMessages((prev) => [
      //     ...prev,
      //     {
      //       id: nanoid(),
      //       role: "assistant" as const,
      //       content: imagesArr.length > 1 ? "Generated Images:" : "Generated Image:",
      //       images: imageData,
      //     },
      //   ])
      // }
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
