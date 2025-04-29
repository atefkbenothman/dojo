"use client"

import {
  useState,
  createContext,
  useContext,
  useCallback,
  useEffect,
} from "react"
import type { CoreMessage, ToolCallPart, ToolResultPart, TextPart } from "ai"
import { asyncTryCatch } from "@/lib/utils"
import type { MCPServerConfig, AIModelInfo } from "@/lib/types"
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from "@/lib/config"
import {
  useQuery,
  QueryClientProvider,
  QueryClient,
  useMutation,
} from "@tanstack/react-query"

const queryClient = new QueryClient()

const initialMessages: CoreMessage[] = [
  {
    role: "assistant",
    content: "Hello. I am an AI assistant",
  },
]

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"
type ChatStatus = "idle" | "loading" | "error"

type AIChatContextType = {
  messages: CoreMessage[]
  context: string
  setContext: (data: string) => void

  sessionId: string | null
  connectionStatus: ConnectionStatus
  connectionError: string | null
  connectedServerId: string | null

  chatStatus: ChatStatus
  chatError: string | null

  availableModels: AIModelInfo[]
  selectedModelId: string
  handleModelChange: (modelId: string) => void

  handleChat: (message: string) => Promise<void>
  handleNewChat: () => void
  handleConnect: (config: MCPServerConfig) => Promise<void>
  handleDisconnect: () => Promise<void>

  isServerHealthy: boolean

  handleImageGeneration: (
    modelId: string,
    prompt: string,
  ) => Promise<{ images: string[] }>
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined)

type AIChatProviderProps = {
  children: React.ReactNode
}

export function AIChatProvider({ children }: AIChatProviderProps) {
  const [messages, setMessages] = useState<CoreMessage[]>(initialMessages)
  const [context, setContext] = useState<string>("")

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected")

  const [chatStatus, setChatStatus] = useState<ChatStatus>("idle")
  const [chatError, setChatError] = useState<string | null>(null)

  const [connectedServerId, setConnectedServerId] = useState<string | null>(
    null,
  )
  const [selectedModelId, setSelectedModelId] =
    useState<string>(DEFAULT_MODEL_ID)

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModelId(modelId)
  }, [])

  /* Check Server Health */
  const { data: serverHealth } = useQuery({
    queryKey: ["server-health"],
    queryFn: async () => {
      const response = await fetch("/api/mcp/health", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error("Server health check failed")
      }
      return response.json()
    },
  })

  const isServerHealthy = serverHealth?.success || false

  /* Connect to MCP Server */
  const connectMutation = useMutation({
    mutationFn: async (config: MCPServerConfig) => {
      const serializableConfig = {
        id: config.id,
        name: config.name,
        command: config.command,
        args: config.args,
        env: config.env,
      }

      const response = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentSessionId: sessionId,
          config: serializableConfig,
        }),
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Connection failed")
      }
      return response.json()
    },
    onMutate: () => {
      setConnectionStatus("connecting")
      setConnectionError(null)
      setConnectedServerId(null)
    },
    onSuccess: (data, variables) => {
      console.log("Connection successful. sessionId:", data.sessionId)
      setSessionId(data.sessionId)
      setConnectionStatus("connected")
      setConnectionError(null)
      setConnectedServerId(variables.id)
    },
    onError: (error) => {
      console.error("Connection failed:", error)
      setConnectionStatus("error")
      setConnectionError("An unexpected error occurred during connecting")
      setSessionId(null)
      setConnectedServerId(null)
    },
  })

  /* Disconnect from MCP Server */
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) {
        throw new Error("No sessionId to disconnect")
      }

      const response = await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Disconnection failed")
      }
      return response.json()
    },
    onMutate: () => {
      setConnectedServerId(null)
    },
    onSuccess: () => {
      console.log("Disconnection successful")
      setConnectionStatus("disconnected")
      setConnectionError(null)
      setSessionId(null)
    },
    onError: (err) => {
      console.error("Disconnection failed:", err)
      setConnectionStatus("error")
      setConnectionError(`Disconnection error: ${err}`)
      setSessionId(null)
      setConnectedServerId(null)
    },
  })

  const handleChat = useCallback(
    async (message: string) => {
      if (chatStatus === "loading") {
        console.warn("handleSend called while already loading")
        return
      }

      const messageToSend = message.trim()
      if (!messageToSend) return

      const userMessage: CoreMessage = {
        role: "user",
        content: messageToSend,
      }
      const messagesToSend: CoreMessage[] = [...messages, userMessage]

      setMessages((prevMessages) => [...prevMessages, userMessage])
      setContext(message)
      setChatStatus("loading")
      setChatError(null)

      const abortController = new AbortController()

      const { data: response, error } = await asyncTryCatch(
        fetch("http://localhost:8888/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: sessionId,
            messages: messagesToSend,
            modelId: selectedModelId,
          }),
          signal: abortController.signal,
        }),
      )

      if (error || !response.ok) {
        console.error("Error during direct streaming chat:", error)
        setChatStatus("error")
        setChatError("Chat stream error")
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant",
            content: `Error: ${error}`,
          },
        ])
        if (!abortController.signal.aborted) {
          abortController.abort()
        }
        return
      }

      const reader = response.body
        ?.pipeThrough(new TextDecoderStream())
        .getReader()

      if (!reader) {
        setChatStatus("error")
        setChatError("Could not get reader in response body")
        if (!abortController.signal.aborted) {
          abortController.abort()
        }
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
              } catch (err) {
                fullResponse += `\n[Stream Data Parse Error for type ${typeId}]`
                continue
              }

              switch (match[1]) {
                case "0": // text-delta
                  fullResponse += parsedContent
                  setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages]
                    const last = updatedMessages[updatedMessages.length - 1]
                    if (
                      shouldStartNewMessage ||
                      !last ||
                      last.role !== "assistant"
                    ) {
                      updatedMessages.push({
                        role: "assistant" as const,
                        content: [
                          { type: "text", text: fullResponse },
                        ] as TextPart[],
                      })
                    } else {
                      // Otherwise update the last assistant message
                      updatedMessages[updatedMessages.length - 1] = {
                        role: "assistant" as const,
                        content: [
                          { type: "text", text: fullResponse },
                        ] as TextPart[],
                      }
                    }
                    return updatedMessages
                  })
                  shouldStartNewMessage = false
                  break
                case "9": // tool-call
                  const toolCallPart: ToolCallPart = {
                    type: "tool-call",
                    toolCallId: parsedContent.toolCallId,
                    toolName: parsedContent.toolName,
                    args: parsedContent.args,
                  }
                  setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages]
                    // Create a new message for the tool call
                    updatedMessages.push({
                      role: "assistant" as const,
                      content: [toolCallPart],
                    })
                    return updatedMessages
                  })
                  shouldStartNewMessage = true
                  break
                case "a": // tool-result
                  const toolResultPart: ToolResultPart = {
                    type: "tool-result",
                    toolCallId: parsedContent.toolCallId,
                    toolName: parsedContent.toolName,
                    result: parsedContent.result,
                    isError: parsedContent.isError,
                  }
                  // console.log("tool-result:", toolResultPart)
                  // setMessages((prevMessages) => {
                  //   const updatedMessages = [...prevMessages]
                  //   updatedMessages.push({
                  //     role: "tool",
                  //     content: [toolResultPart],
                  //   })
                  //   return updatedMessages
                  // })
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
                  console.warn(`Unknown stream part type: ${match[1]}`)
                  break
              }
            }
          }
        } catch (err) {
          console.error("Error parsing stream chunk:", err, "Chunk:", value)
          fullResponse += `\n[Stream Parse Error]`
          if (!abortController.signal.aborted) {
            abortController.abort()
          }
        }
      }

      setChatStatus("idle")
    },
    [connectionStatus, sessionId, context, messages, chatStatus],
  )

  const handleNewChat = useCallback(() => {
    setMessages(initialMessages)
    setChatStatus("idle")
    setChatError(null)
  }, [])

  const handleConnect = useCallback(
    async (config: MCPServerConfig) => {
      if (
        connectionStatus === "connecting" ||
        connectionStatus === "connected"
      ) {
        return
      }

      await connectMutation.mutateAsync(config)
    },
    [connectionStatus, connectMutation],
  )

  const handleDisconnect = useCallback(async () => {
    if (connectionStatus !== "connected" || !sessionId) {
      console.log("Disconnect requested but not connected or no sessionID")
      setConnectionStatus("disconnected")
      setSessionId(null)
      setConnectionError(null)
      return
    }

    await disconnectMutation.mutateAsync()
  }, [connectionStatus, sessionId, disconnectMutation])

  const handleImageGeneration = useCallback(
    async (modelId: string, prompt: string) => {
      const { data, error } = await asyncTryCatch(
        fetch("/api/mcp/image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ modelId, prompt }),
          cache: "no-store",
        }),
      )

      if (error || !data) {
        console.error(`[Next Action - Image] /image request failed:`, error)
        return { images: [] }
      }

      const { images } = await data.json()
      return { images }
    },
    [],
  )

  const value: AIChatContextType = {
    messages,
    context,
    sessionId,
    connectionStatus,
    connectionError,
    setContext,
    chatStatus,
    chatError,
    connectedServerId,
    availableModels: AVAILABLE_MODELS,
    selectedModelId,
    handleChat,
    handleNewChat,
    handleConnect,
    handleDisconnect,
    handleModelChange,
    isServerHealthy,
    handleImageGeneration,
  }

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  )
}

export function useChatProvider() {
  const context = useContext(AIChatContext)
  if (!context) {
    throw new Error("useChatProvider must be used within an AIChatProvider")
  }
  return context
}

export function AIChatProviderRoot({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AIChatProvider>{children}</AIChatProvider>
    </QueryClientProvider>
  )
}
