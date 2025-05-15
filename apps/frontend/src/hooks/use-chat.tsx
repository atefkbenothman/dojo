"use client"

import { useState, createContext, useContext, useCallback } from "react"
import type { UIMessage } from "ai"
import { useChat, Message } from "@ai-sdk/react"
import { nanoid } from "nanoid"
import { QueryClientProvider, QueryClient, useMutation } from "@tanstack/react-query"
import { useConnectionContext } from "@/hooks/use-connection"
import { useModelContext } from "@/hooks/use-model"
import { SYSTEM_PROMPT } from "@/lib/config"
import type { AgentConfig } from "@/lib/types"

interface ChatRequestOptionsBody {
  sessionId: string | null
  modelId?: string
  interactionType: string
  config?: AgentConfig
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
  const { sessionId } = useConnectionContext()
  const { availableModels, selectedModelId } = useModelContext()

  const [context, setContext] = useState<string>("")
  const [currentInteractionType, setCurrentInteractionType] = useState<string | null>(null)

  const {
    messages,
    status,
    input,
    append: originalAppend,
    setMessages,
    error,
    stop,
  } = useChat({
    api: "/api/mcp/chat",
    initialMessages: initialMessages as Message[],
    generateId: () => nanoid(),
    onError: (err) => {
      console.error("useChat error:", err.message, err.stack, err)
      setCurrentInteractionType(null)
    },
    onFinish: () => {
      setCurrentInteractionType(null)
    },
  })

  /* Generate Image */
  const imageGenerationMutation = useMutation({
    mutationFn: async ({ modelId, prompt }: { modelId: string; prompt: string }) => {
      const response = await fetch("/api/mcp/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, prompt }),
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Image generation failed")
      const result = await response.json()
      if (result.error) throw new Error(result.error)
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

      await originalAppend(messageToRelay, {
        body: options.body,
      })
    },
    [originalAppend, setMessages, setCurrentInteractionType],
  )

  const handleChat = useCallback(
    async (message: string) => {
      if (status === "streaming") return

      const prompt = message.trim()
      if (!prompt) return

      const selectedModel = availableModels.find((m) => m.id === selectedModelId)

      if (selectedModel?.type === "image") {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "user",
            content: prompt,
          },
        ])
        imageGenerationMutation.mutate({ modelId: selectedModel.id, prompt })
        return
      }

      const userMessage: Omit<Message, "id"> = {
        role: "user",
        content: prompt,
      }

      await unifiedAppend(userMessage, {
        body: {
          sessionId: sessionId,
          modelId: selectedModelId,
          interactionType: "chat",
        } as ChatRequestOptionsBody,
        interactionType: "chat",
      })
    },
    [status, availableModels, selectedModelId, unifiedAppend, imageGenerationMutation, setMessages, sessionId],
  )

  const handleNewChat = useCallback(() => {
    setMessages(initialMessages)
  }, [setMessages])

  return {
    messages: messages as (UIMessage & { images?: { type: "generated_image"; images: { base64: string }[] } })[],
    context,
    status,
    input,
    error,
    currentInteractionType,
    setContext,
    handleChat,
    handleNewChat,
    unifiedAppend,
    stop,
    setMessages,
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
