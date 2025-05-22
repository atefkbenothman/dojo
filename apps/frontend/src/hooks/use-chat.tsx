"use client"

import { useUserContext } from "./use-user-id"
import { env } from "@/env"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useModelContext } from "@/hooks/use-model"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { SYSTEM_PROMPT } from "@/lib/config"
import { useChat, Message } from "@ai-sdk/react"
import type { AgentConfig, AIModel } from "@dojo/config"
import { QueryClientProvider, QueryClient, useMutation } from "@tanstack/react-query"
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

const queryClient = new QueryClient()

const initialMessages: Message[] = [
  {
    id: "system",
    role: "system",
    content: SYSTEM_PROMPT,
  },
  {
    id: "intro",
    role: "assistant",
    content: "Hello. I am an AI assistant",
  },
]

export function useAIChat() {
  const userId = useUserContext()

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

  /* Generate Image */
  const imageGenerationMutation = useMutation({
    mutationFn: async ({ modelId, prompt, apiKey }: { modelId: string; prompt: string; apiKey: string | null }) => {
      if (!apiKey) {
        const errorMsg = `API key for image generation with model ${selectedModel.id} not provided.`
        setChatError(errorMsg)
        throw new Error(errorMsg)
      }
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, modelId, prompt, apiKey }),
        cache: "no-store",
      })
      if (!response.ok) {
        const errorText = await response.text()
        const errorMsg = `There was an error generating the image. Status: ${response.status}. Error: ${errorText || response.statusText}`
        setChatError(errorMsg)
        throw new Error(errorMsg)
      }
      const result = await response.json()
      if (result.error) {
        setChatError(result.error)
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: (result) => {
      const imageData = {
        type: "generated_image",
        images: result.images.images,
      }
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: "Generated Image(s):",
          images: imageData,
        },
      ])
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
        imageGenerationMutation.mutate({ modelId: selectedModel.id, prompt, apiKey })
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
  return (
    <QueryClientProvider client={queryClient}>
      <AIChatProvider>{children}</AIChatProvider>
    </QueryClientProvider>
  )
}
