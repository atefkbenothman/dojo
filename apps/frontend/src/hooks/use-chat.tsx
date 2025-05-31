"use client"

import { useModelContext } from "@/hooks/use-model"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { DEFAULT_ASSISTANT_MESSAGE, SYSTEM_PROMPT } from "@/lib/ai/constants"
import { getApiKeyForModel } from "@/lib/utils"
import { useChat, Message } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import { nanoid } from "nanoid"
import { useState, createContext, useContext, useCallback } from "react"

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

export type ChatInteractionType = "chat" | "agent"

export function useAIChat() {
  const { play } = useSoundEffectContext()
  const { selectedModel } = useModelContext()

  const [context, setContext] = useState<string>("")
  const [chatError, setChatError] = useState<string | null>(null)

  const { messages, status, input, append, setMessages, error, stop } = useChat({
    api: "/api/chat",
    initialMessages: initialMessages as Message[],
    generateId: () => nanoid(),
    onError: (err) => {
      play("./sounds/error.mp3", { volume: 0.5 })
      setChatError(err.message || "An unexpected error occurred during the chat.")
    },
    onFinish: () => {
      play("./sounds/done.mp3", { volume: 0.5 })
    },
  })

  const handleChat = useCallback(
    async (message: string) => {
      if (status === "streaming") return

      play("./sounds/chat.mp3", { volume: 0.5 })

      setChatError(null)

      const prompt = message.trim()
      if (!prompt) return

      const apiKey = getApiKeyForModel(selectedModel)

      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: prompt,
      }

      const body = {
        modelId: selectedModel.id,
        interactionType: "chat",
        ...(apiKey ? { apiKey } : {}),
      }

      await append(userMessage, { body })
    },
    [status, selectedModel, append, play],
  )

  const handleNewChat = useCallback(() => {
    setMessages(initialMessages)
    stop()
    setChatError(null)
  }, [setMessages, stop])

  return {
    messages: messages as (UIMessage & { images?: { type: "generated_image"; images: { base64: string }[] } })[],
    context,
    status,
    input,
    error,
    chatError,
    append,
    setContext,
    handleChat,
    handleNewChat,
    stop,
    setMessages,
    setChatError,
  }
}

type AIChatContextType = ReturnType<typeof useAIChat>

const AIChatContext = createContext<AIChatContextType | undefined>(undefined)

type AIChatProviderProps = {
  children: React.ReactNode
}

export function useChatProvider() {
  const context = useContext(AIChatContext)
  if (!context) {
    throw new Error("useChatProvider must be used within an AIChatProvider")
  }
  return context
}

export function AIChatProvider({ children }: AIChatProviderProps) {
  const chatState = useAIChat()
  return <AIChatContext.Provider value={chatState}>{children}</AIChatContext.Provider>
}
