"use client"

import { useState, createContext, useContext, useCallback } from "react"
import type { UIMessage } from "ai"
import { useChat, Message } from "@ai-sdk/react"
import { nanoid } from "nanoid"
import { asyncTryCatch } from "@/lib/utils"
import { QueryClientProvider, QueryClient, useMutation } from "@tanstack/react-query"
import { useConnectionContext } from "@/hooks/use-connection"
import { useModelContext } from "@/hooks/use-model"
import { SYSTEM_PROMPT } from "@/lib/config"

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

type AIChatContextType = {
  messages: UIMessage[]
  context: string
  input: string
  status: "error" | "submitted" | "streaming" | "ready"
  error: Error | undefined
  setContext: (data: string) => void
  handleChat: (message: string) => Promise<void>
  handleNewChat: () => void
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined)

type AIChatProviderProps = {
  children: React.ReactNode
}

export function AIChatProvider({ children }: AIChatProviderProps) {
  const { sessionId } = useConnectionContext()
  const { availableModels, selectedModelId } = useModelContext()

  const [context, setContext] = useState<string>("")

  const { messages, status, input, append, setMessages, error } = useChat({
    api: "/api/mcp/chat",
    initialMessages: initialMessages as Message[],
    generateId: () => nanoid(),
    onError: (err) => {
      console.error("useChat error:", err)
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
      // if (result.images.images && result.images.images.length > 0) {
      //   setMessages((prev) => [
      //     ...prev,
      //     {
      //       role: "assistant",
      //       content: result.images.images.map((img: any) => ({
      //         type: "image_display",
      //         base64: img.base64,
      //       })),
      //     },
      //   ])
      //   setChatStatus("idle")
      // } else {
      //   setChatStatus("error")
      //   setChatError("Image generation succeeded but returned no images.")
      // }
    },
    onError: (error: Error) => {
      // setChatStatus("error")
    },
  })

  const handleChat = useCallback(
    async (message: string) => {
      if (status === "streaming") return

      const prompt = message.trim()
      if (!prompt) return

      const selectedModel = availableModels.find((m) => m.id === selectedModelId)

      if (selectedModel?.type === "image") {
        imageGenerationMutation.mutate({ modelId: selectedModel.id, prompt })
        return
      }

      const userMessage: Omit<Message, "id"> = {
        role: "user",
        content: prompt,
      }

      append(userMessage, {
        body: {
          sessionId: sessionId,
          modelId: selectedModelId,
        },
      })
    },
    [status, availableModels, selectedModelId, append, imageGenerationMutation],
  )

  const handleNewChat = useCallback(() => {
    setMessages(initialMessages)
  }, [setMessages])

  const value: AIChatContextType = {
    messages,
    context,
    status,
    input,
    error,
    setContext,
    handleChat,
    handleNewChat,
  }

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
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
