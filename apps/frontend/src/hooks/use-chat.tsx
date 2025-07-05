"use client"

import { useAIModels } from "@/hooks/use-ai-models"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { SYSTEM_PROMPT } from "@/lib/constants"
import { useSession } from "@/providers/session-provider"
import { useChat, Message } from "@ai-sdk/react"
import { useAuthToken } from "@convex-dev/auth/react"
import type { UIMessage } from "ai"
import { nanoid } from "nanoid"
import { useState, createContext, useContext, useCallback, memo } from "react"

const initialMessages: Message[] = [
  {
    id: "system",
    role: "system",
    content: SYSTEM_PROMPT,
  },
]

export function useAIChat() {
  const authToken = useAuthToken()

  const { play } = useSoundEffectContext()
  const { clientSessionId } = useSession()
  const { selectedModel } = useAIModels()

  const [context, setContext] = useState<string>("")
  const [chatError, setChatError] = useState<string | null>(null)

  const { messages, status, input, append, setMessages, error, stop } = useChat({
    api: "/api/chat",
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(clientSessionId ? { "X-Guest-Session-ID": clientSessionId } : {}),
    },
    initialMessages: initialMessages as Message[],
    experimental_throttle: 500,
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

      setChatError(null)

      const prompt = message.trim()
      if (!prompt) return

      if (!selectedModel) return

      if (!authToken && selectedModel?.requiresApiKey) {
        setChatError("Please login to use this model.")
        play("./sounds/error.mp3", { volume: 0.5 })
        return
      }

      play("./sounds/chat.mp3", { volume: 0.5 })

      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: prompt,
      }

      await append(userMessage, {
        body: {
          interactionType: "chat",
          chat: {
            modelId: selectedModel._id,
          },
        },
      })
    },
    [status, selectedModel, append, play, authToken],
  )

  const handleNewChat = useCallback(() => {
    stop()
    setMessages(initialMessages)
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

export const AIChatProvider = memo(function AIChatProvider({ children }: AIChatProviderProps) {
  const chatState = useAIChat()
  return <AIChatContext.Provider value={chatState}>{children}</AIChatContext.Provider>
})
