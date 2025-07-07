"use client"

import { useAIModels } from "@/hooks/use-ai-models"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { SYSTEM_PROMPT } from "@/lib/constants"
import { useSession } from "@/providers/session-provider"
import { useChat as useAIChat, Message } from "@ai-sdk/react"
import { useAuthToken } from "@convex-dev/auth/react"
import { env } from "@dojo/env/frontend"
import type { UIMessage } from "ai"
import { nanoid } from "nanoid"
import { useState, useCallback, useMemo } from "react"

const initialMessages: Message[] = [
  {
    id: "system",
    role: "system",
    content: SYSTEM_PROMPT,
  },
]

export function useChat() {
  const authToken = useAuthToken()

  const { play } = useSoundEffectContext()
  const { clientSessionId } = useSession()
  const { selectedModel } = useAIModels()

  const [context, setContext] = useState<string>("")
  const [chatError, setChatError] = useState<string | null>(null)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)

  const headers = useMemo(
    () => ({
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(clientSessionId ? { "X-Guest-Session-ID": clientSessionId } : {}),
    }),
    [authToken, clientSessionId],
  )

  const onError = useCallback(
    (err: Error) => {
      play("./sounds/error.mp3", { volume: 0.5 })
      setChatError(err.message || "An unexpected error occurred during the chat.")
    },
    [play],
  )

  const onFinish = useCallback(() => {
    play("./sounds/done.mp3", { volume: 0.5 })
    setHasUnreadMessages(true)
  }, [play])

  const { messages, status, input, append, setMessages, error, stop, setInput, handleInputChange, handleSubmit } =
    useAIChat({
      id: "unified-chat",
      api: `${env.NEXT_PUBLIC_BACKEND_URL}/api/chat`,
      headers,
      initialMessages: initialMessages as Message[],
      experimental_throttle: 500,
      generateId: () => nanoid(),
      onError,
      onFinish,
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
          type: "chat",
          modelId: selectedModel._id,
        },
      })
    },
    [status, selectedModel, append, play, authToken],
  )

  const handleNewChat = useCallback(() => {
    stop()
    setMessages(initialMessages)
    setChatError(null)
    setHasUnreadMessages(false)
  }, [setMessages, stop])

  const clearNotifications = useCallback(() => {
    setHasUnreadMessages(false)
  }, [])

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
    hasUnreadMessages,
    clearNotifications,
    setInput,
    handleInputChange,
    handleSubmit,
  }
}
