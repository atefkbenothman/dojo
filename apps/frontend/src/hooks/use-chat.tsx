"use client"

import { useUserContext } from "./use-user-id"
import { env } from "@/env"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useModelContext } from "@/hooks/use-model"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { DEFAULT_ASSISTANT_MESSAGE, SYSTEM_PROMPT } from "@/lib/ai/constants"
import { useTRPCClient } from "@/lib/trpc/context"
import { useChat, Message } from "@ai-sdk/react"
import type { RouterOutputs } from "@dojo/backend/src/types"
import type { ImageGenerationInput } from "@dojo/backend/src/types"
import type { AgentConfig, AIModel } from "@dojo/config"
import { useMutation } from "@tanstack/react-query"
import type { UIMessage } from "ai"
import { nanoid } from "nanoid"
import { useState, createContext, useContext, useCallback } from "react"

interface ChatRequestOptionsBody {
  userId: string | null
  modelId: string
  interactionType: string
  config?: AgentConfig
  apiKey?: string | null
}

const initialMessages: Message[] = [
  {
    id: "system",
    role: "system",
    content: SYSTEM_PROMPT,
  },
  {
    id: "intro",
    role: "assistant",
    content: DEFAULT_ASSISTANT_MESSAGE,
  },
]

export function useAIChat() {
  const userId = useUserContext()
  const trpcClient = useTRPCClient()

  const { selectedModel } = useModelContext()
  const { readStorage } = useLocalStorage()

  const { play } = useSoundEffectContext()

  const [context, setContext] = useState<string>("")
  const [currentInteractionType, setCurrentInteractionType] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)

  const getApiKeyForModel = useCallback(
    async (model: AIModel): Promise<string | null> => {
      const localStorageKey = `${model.provider.toUpperCase()}_API_KEY`
      let apiKey = readStorage<string>(localStorageKey)

      if (!apiKey) {
        const envJsKey = `NEXT_PUBLIC_${model.provider.toUpperCase()}_API_KEY` as keyof typeof env
        const envValue = env[envJsKey]
        if (envValue) {
          apiKey = envValue
        }
      }
      return apiKey
    },
    [readStorage],
  )

  const { messages, status, input, append, setMessages, error, stop } = useChat({
    api: "/api/chat",
    initialMessages: initialMessages as Message[],
    generateId: () => nanoid(),
    onError: (err) => {
      play("./error.mp3", { volume: 0.5 })
      setChatError(err.message || "An unexpected error occurred during the chat.")
      setCurrentInteractionType(null)
    },
    onFinish: () => {
      play("./done.mp3", { volume: 0.5 })
      setCurrentInteractionType(null)
    },
  })

  const imageGenerationMutation = useMutation<RouterOutputs["image"]["generate"], Error, ImageGenerationInput>({
    mutationFn: async (data: ImageGenerationInput) => {
      if (!data.apiKey) {
        const errorMsg = `API key for image generation with model ${data.modelId} not provided.`
        setChatError(errorMsg)
        throw new Error(errorMsg)
      }
      return trpcClient.image.generate.mutate(data)
    },
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
    },
    onError: (error: Error) => {
      play("./error.mp3", { volume: 0.5 })
      const message = error.message || "An unexpected error occurred during image generation."
      setChatError(message)
      console.error("Image generation mutation error:", error)
    },
  })

  const unifiedAppend = useCallback(
    async (
      messageToRelay: Message | Omit<Message, "id">,
      options: {
        body: ChatRequestOptionsBody
        interactionType: string
        initialDisplayMessage?: {
          id?: string
          role: "assistant" | "system" | "user" | "function" | "tool"
          content: string
        }
      },
    ) => {
      setCurrentInteractionType(options.interactionType)

      if (options.initialDisplayMessage) {
        const initialMsg = options.initialDisplayMessage
        setMessages((prev) => [
          ...prev,
          {
            id: initialMsg.id || nanoid(),
            role: initialMsg.role,
            content: initialMsg.content,
          } as Message,
        ])
      }

      await append(messageToRelay, {
        body: options.body,
      })
    },
    [append, setMessages, setCurrentInteractionType],
  )

  const handleChat = useCallback(
    async (message: string) => {
      if (status === "streaming") return

      const prompt = message.trim()
      if (!prompt) return

      setChatError(null)

      const apiKey = await getApiKeyForModel(selectedModel)

      play("./chat.mp3", { volume: 0.5 })

      if (selectedModel.type === "image") {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "user",
            content: prompt,
          },
        ])
        if (!apiKey) {
          setChatError(`API key for ${selectedModel.name} is not configured.`)
          play("./error.mp3", { volume: 0.5 })
          return
        }
        imageGenerationMutation.mutate({
          modelId: selectedModel.id,
          prompt,
          apiKey,
        })
        return
      }

      const userMessage: Omit<Message, "id"> = {
        role: "user",
        content: prompt,
      }

      await unifiedAppend(userMessage, {
        body: {
          userId: userId,
          modelId: selectedModel.id,
          interactionType: "chat",
          apiKey: apiKey,
        } as ChatRequestOptionsBody,
        interactionType: "chat",
      })
    },
    [status, selectedModel, unifiedAppend, imageGenerationMutation, setMessages, userId, getApiKeyForModel, play],
  )

  const handleNewChat = useCallback(() => {
    setMessages(initialMessages)
    setChatError(null)
  }, [setMessages])

  return {
    messages: messages as (UIMessage & { images?: { type: "generated_image"; images: { base64: string }[] } })[],
    context,
    status,
    input,
    error,
    currentInteractionType,
    chatError,
    setContext,
    handleChat,
    handleNewChat,
    unifiedAppend,
    stop,
    setMessages,
    isImageGenerating: imageGenerationMutation.isPending,
  }
}

type AIChatContextType = ReturnType<typeof useAIChat>

const AIChatContext = createContext<AIChatContextType | undefined>(undefined)

type AIChatProviderProps = {
  children: React.ReactNode
}

export function AIChatProvider({ children }: AIChatProviderProps) {
  const chatState = useAIChat()
  return <AIChatContext.Provider value={chatState}>{children}</AIChatContext.Provider>
}

export function useChatProvider() {
  const context = useContext(AIChatContext)
  if (!context) {
    throw new Error("useChatProvider must be used within an AIChatProvider")
  }
  return context
}

export function AIChatProviderRoot({ children }: { children: React.ReactNode }) {
  return <AIChatProvider>{children}</AIChatProvider>
}
