"use client"

import {
  useState,
  createContext,
  useContext,
  useCallback,
  useEffect,
} from "react"
import type { CoreMessage } from "ai"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import {
  connectMCP,
  disconnectMCP,
  getAvailableMCPServers,
} from "@/actions/mcp-client-actions"
import { toast } from "sonner"
import { asyncTryCatch } from "@/lib/utils"

interface AvailableServersInfo {
  id: string
  name: string
  userArgs: boolean
}

interface AIModelInfo {
  id: string
  name: string
}

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

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"
type ChatStatus = "idle" | "loading" | "error"

type AIChatContextType = {
  messages: CoreMessage[]
  context: string
  sessionId: string | null
  connectionStatus: ConnectionStatus
  connectionError: string | null
  setContext: (data: string) => void

  chatStatus: ChatStatus
  chatError: string | null

  availableServers: AvailableServersInfo[] | null
  connectedServerId: string | null

  availableModels: AIModelInfo[]
  selectedModelId: string
  handleModelChange: (modelId: string) => void

  handleChat: (message: string) => Promise<void>
  handleNewChat: () => void
  handleConnect: (serverId: string, userArgs?: string[]) => Promise<void>
  handleDisconnect: () => Promise<void>
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined)

type AIChatProviderProps = {
  children: React.ReactNode
}

const initialMessages: CoreMessage[] = [
  {
    role: "assistant",
    content: "Hello. I am an AI assistant",
  },
]

export function AIChatProvider({ children }: AIChatProviderProps) {
  const { play } = useSoundEffect("./hover.mp3", { volume: 0.5 })

  const [messages, setMessages] = useState<CoreMessage[]>(initialMessages)
  const [context, setContext] = useState<string>("")

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected")

  const [chatStatus, setChatStatus] = useState<ChatStatus>("idle")
  const [chatError, setChatError] = useState<string | null>(null)

  const [availableServers, setAvailableServers] = useState<
    AvailableServersInfo[] | null
  >(null)
  const [connectedServerId, setConnectedServerId] = useState<string | null>(
    null,
  )

  const [selectedModelId, setSelectedModelId] =
    useState<string>(DEFAULT_MODEL_ID)

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await getAvailableMCPServers()

        if (response.error) {
          toast.error("Error fetching available mcp services", {
            position: "top-right",
          })
          return
        }

        setAvailableServers(response.servers)
      } catch (err) {
        console.error("Exception fetching servers:", err)
        setAvailableServers(null)
      }
    }
    fetchServers()
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
          fullResponse += value
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages]
            updatedMessages[updatedMessages.length - 1] = {
              role: "assistant",
              content: fullResponse,
            }
            return updatedMessages
          })
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
    async (serverId: string, userArgs?: string[]) => {
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

      try {
        const result = await connectMCP(sessionId, serverId, userArgs)

        if (!result.sessionId) {
          console.error("Connection failed: result is undefined")
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
        setConnectedServerId(serverId)
      } catch (err) {
        console.error("Exception during connect action call:", err)
        setConnectionStatus("error")
        setConnectionError("An unexpected error occurred during connecting")
        setSessionId(null)
      }
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

    try {
      const result = await disconnectMCP(sessionId)

      if (result.error) {
        console.error("Disconnection failed:", result.error)
        setConnectionStatus("error")
        setConnectionError(`Disconnection error: ${result.error}`)
        return
      }

      console.log("Disconnection successful")

      setConnectionStatus("disconnected")
      setConnectionError(null)
    } catch (err) {
      console.error("Exception during disconnect action call:", err)
      setConnectionStatus("error")
      setConnectionError("Error during disconnect action call")
    } finally {
      setSessionId(null)
      setConnectedServerId(null)
    }

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
    availableServers,
    connectedServerId,
    availableModels: AVAILABLE_MODELS,
    selectedModelId,
    handleChat,
    handleNewChat,
    handleConnect,
    handleDisconnect,
    handleModelChange,
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
