"use client"

import { useState, createContext, useContext } from "react"
import type { CoreMessage, ToolCallPart, ToolResultPart, TextPart } from "ai"
import { asyncTryCatch } from "@/lib/utils"
import { QueryClientProvider, QueryClient, useMutation } from "@tanstack/react-query"
import { useConnectionContext } from "@/hooks/use-connection"
import { useModelContext } from "@/hooks/use-model"
import { SYSTEM_PROMPT } from "@/lib/config"

const queryClient = new QueryClient()

const initialMessages: CoreMessage[] = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
  {
    role: "assistant",
    content: "Hello. I am an AI assistant",
  },
]

type ChatStatus = "idle" | "loading" | "error"

type AIChatContextType = {
  messages: CoreMessage[]
  context: string
  setContext: (data: string) => void
  chatStatus: ChatStatus
  chatError: string | null
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

  const [messages, setMessages] = useState<CoreMessage[]>(initialMessages)
  const [context, setContext] = useState<string>("")
  const [chatStatus, setChatStatus] = useState<ChatStatus>("idle")
  const [chatError, setChatError] = useState<string | null>(null)

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
      return response.json()
    },
  })

  const generateImage = async (modelId: string, prompt: string) => {
    const result = await imageGenerationMutation.mutateAsync({
      modelId: modelId,
      prompt: prompt,
    })

    if (result.error) throw new Error(result.error)

    if (result.images.images && result.images.images.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.images.images.map((img: any) => ({
            type: "image_display",
            base64: img.base64,
          })),
        },
      ])
      setChatStatus("idle")
    }
  }

  const handleChat = async (message: string) => {
    if (chatStatus === "loading") return

    const prompt = message.trim()
    if (!prompt) return

    const userMessage: CoreMessage = { role: "user", content: prompt }
    const messagesToSend: CoreMessage[] = [...messages, userMessage]

    setMessages(messagesToSend)
    setContext(message)
    setChatStatus("loading")
    setChatError(null)

    const selectedModel = availableModels.find((m) => m.id === selectedModelId)

    // Image generation
    if (selectedModel?.type === "image") {
      try {
        generateImage(selectedModel.id, prompt)
      } catch {
        setChatStatus("error")
        setChatError("Image generaton failed")
      }
      return
    }

    // Normal text streaming
    const abortController = new AbortController()

    const { data: response, error } = await asyncTryCatch(
      fetch("http://localhost:8888/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          messages: messagesToSend,
          modelId: selectedModelId,
        }),
        signal: abortController.signal,
      }),
    )
    if (error || !response.ok) {
      setChatStatus("error")
      setChatError("Chat stream error")
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${error}` }])
      if (!abortController.signal.aborted) abortController.abort()
      return
    }
    const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader()
    if (!reader) {
      setChatStatus("error")
      setChatError("Could not get reader in response body")
      if (!abortController.signal.aborted) abortController.abort()
      return
    }
    let fullResponse = ""
    let shouldStartNewMessage = true
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (!value) continue
      try {
        const lines = value.split("\n").filter((line) => line.trim() !== "")
        for (const line of lines) {
          const match = line.match(/^([0-9a-zA-Z]):(.*)$/)
          if (match) {
            const typeId = match[1]
            const contentJson = match[2]
            let parsedContent: any
            try {
              parsedContent = JSON.parse(contentJson!)
            } catch {
              fullResponse += `\n[Stream Data Parse Error for type ${typeId}]`
              continue
            }
            switch (typeId) {
              case "0": // text-delta
                fullResponse += parsedContent
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (shouldStartNewMessage || !last || last.role !== "assistant") {
                    updated.push({
                      role: "assistant" as const,
                      content: [{ type: "text", text: fullResponse }] as TextPart[],
                    })
                  } else {
                    updated[updated.length - 1] = {
                      role: "assistant" as const,
                      content: [{ type: "text", text: fullResponse }] as TextPart[],
                    }
                  }
                  return updated
                })
                shouldStartNewMessage = false
                break
              case "9": // tool-call
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant" as const,
                    content: [
                      {
                        type: "tool-call",
                        toolCallId: parsedContent.toolCallId,
                        toolName: parsedContent.toolName,
                        args: parsedContent.args,
                      },
                    ],
                  },
                ])
                shouldStartNewMessage = true
                break
              case "a": // tool-result
                shouldStartNewMessage = true
                break
              case "d": // finish
                break
              case "3": // error
                fullResponse += `\n[Error: ${parsedContent}]`
                setChatStatus("error")
                setChatError(parsedContent)
                break
              default:
                break
            }
          }
        }
      } catch {
        fullResponse += `\n[Stream Parse Error]`
        if (!abortController.signal.aborted) abortController.abort()
      }
    }
    setChatStatus("idle")
  }

  const handleNewChat = () => {
    setMessages(initialMessages)
    setChatStatus("idle")
    setChatError(null)
  }

  const value: AIChatContextType = {
    messages,
    context,
    setContext,
    chatStatus,
    chatError,
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
