"use client"

import {
  useState,
  createContext,
  useContext,
  useCallback,
  useEffect,
} from "react"
import type { CoreMessage } from "ai"
import {
  connectMCP,
  disconnectMCP,
  checkMCPHealth,
} from "@/actions/mcp-client-actions"
import { asyncTryCatch } from "@/lib/utils"
import type { MCPServerConfig, AIModelInfo } from "@/lib/types"

const AVAILABLE_MODELS: AIModelInfo[] = [
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
  },
  {
    id: "gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "Deepseek R1",
  },
]

const DEFAULT_MODEL_ID = "gemini-1.5-flash"

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

  const [isServerHealthy, setIsServerHealthy] = useState<boolean>(false)

  useEffect(() => {
    const checkServerHealth = async () => {
      const { success, error } = await checkMCPHealth()

      if (error || !success) {
        setIsServerHealthy(false)
        return
      }

      setIsServerHealthy(success)
    }
    checkServerHealth()
  }, [])

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModelId(modelId)
  }, [])

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

      setMessages((prevMessages) => {
        return [...prevMessages, { role: "assistant", content: "" }]
      })

      let fullResponse = ""

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
                  break
                case "9": // tool-call
                  fullResponse += `\n[Calling tool: ${parsedContent.toolName} with args: ${JSON.stringify(parsedContent.args)}]\n\n`
                  break
                case "a": // tool-result
                  fullResponse += `\n[Tool result: ${JSON.stringify(parsedContent.result)}]`
                  break
                case "d": // finish
                  // fullResponse += `\n[Finished: ${parsedContent.finishReason}]`
                  // if (parsedContent.usage) {
                  //   fullResponse += `\n[Usage: ${JSON.stringify(parsedContent.usage)}]`
                  // }
                  break
                case "3": // error
                  const errorMessage =
                    typeof parsedContent === "object"
                      ? JSON.stringify(parsedContent)
                      : parsedContent
                  fullResponse += `\n[Error: ${errorMessage}]`
                  setChatStatus("error")
                  setChatError(errorMessage)
                  break
                default:
                  console.warn(`Unknown stream part type: ${match[1]}`)
                  break
              }
              setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages]
                updatedMessages[updatedMessages.length - 1] = {
                  role: "assistant",
                  content: fullResponse,
                }
                return updatedMessages
              })
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
        console.log("Connect requested, but already connecting or connected")
        return
      }

      console.log("Attempting to connect...")

      setConnectionStatus("connecting")
      setConnectionError(null)
      setConnectedServerId(null)

      const { data: result, error } = await asyncTryCatch(
        connectMCP(sessionId, config),
      )

      if (error || !result?.sessionId) {
        console.error("Connection failed:", error || "result is undefined")
        setConnectionStatus("error")
        setConnectionError("An unexpected error occurred during connecting")
        setSessionId(null)
        setConnectedServerId(null)
        return
      }

      console.log("Connection successful. sessionId:", result.sessionId)
      setSessionId(result.sessionId)
      setConnectionStatus("connected")
      setConnectionError(null)
      setConnectedServerId(config.id)
    },
    [connectionStatus, sessionId],
  )

  const handleDisconnect = useCallback(async () => {
    if (connectionStatus !== "connected" || !sessionId) {
      console.log("Disconnect requested, but not connected or no sessionID")
      setConnectionStatus("disconnected")
      setSessionId(null)
      setConnectionError(null)
      return
    }

    setConnectedServerId(null)

    const { data: result, error } = await asyncTryCatch(
      disconnectMCP(sessionId),
    )

    if (error || result?.error) {
      console.error("Disconnection failed:", error || result?.error)
      setConnectionStatus("error")
      setConnectionError(`Disconnection error: ${error || result?.error}`)
      setSessionId(null)
      setConnectedServerId(null)
      return
    }

    console.log("Disconnection successful")
    setConnectionStatus("disconnected")
    setConnectionError(null)
    setSessionId(null)
    setConnectedServerId(null)

    console.log(`Attempting to disconnect session: ${sessionId}...`)
  }, [connectionStatus, sessionId, connectedServerId])

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
