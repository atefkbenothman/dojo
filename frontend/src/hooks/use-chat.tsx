"use client"

import { useState, createContext, useContext, useCallback } from "react"
import type { CoreMessage } from "ai"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import {
  connectMCP,
  disconnectMCP,
  sendChatMCP,
} from "@/actions/mcp-client-actions"

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"
type ChatStatus = "idle" | "loading" | "error"

type AIChatContextType = {
  messages: CoreMessage[]
  input: string
  context: string
  setContext: (data: string) => void

  sessionId: string | null
  connectionStatus: ConnectionStatus
  connectionError: string | null

  chatStatus: ChatStatus
  chatError: string | null

  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) => void
  handleSend: () => Promise<void>
  handleNewChat: () => void
  handleConnect: () => Promise<void>
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
  const [input, setInput] = useState<string>("")
  const [context, setContext] = useState<string>("")

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected")

  const [chatStatus, setChatStatus] = useState<ChatStatus>("idle")
  const [chatError, setChatError] = useState<string | null>(null)

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(e.target.value)
  }

  const handleNewChat = () => {
    setMessages(initialMessages)
    setInput("")
    setChatStatus("idle")
    setChatError(null)
  }

  const handleConnect = useCallback(async () => {
    if (connectionStatus === "connecting" || connectionStatus === "connected") {
      console.log("Connect requested, but already connecting or connected")
      return
    }

    console.log("Attempting to connect...")

    setConnectionStatus("connecting")
    setConnectionError(null)

    try {
      const result = await connectMCP(sessionId)

      if (!result.sessionId) {
        console.error("Connection failed: result is undefined")
        setConnectionStatus("error")
        setConnectionError("An unexpected error occurred during connecting")
        setSessionId(null)
        return
      }

      console.log("Connection successful. sessionId:", result.sessionId)
      setSessionId(result.sessionId)
      setConnectionStatus("connected")
      setConnectionError(null)
    } catch (err) {
      console.error("Exception during connect action call:", err)
      setConnectionStatus("error")
      setConnectionError("An unexpected error occurred during connecting")
      setSessionId(null)
    }
  }, [connectionStatus, sessionId])

  const handleDisconnect = useCallback(async () => {
    if (connectionStatus !== "connected" || !sessionId) {
      console.log("Disconnect requested, but not connected or no sessionID")
      setConnectionStatus("disconnected")
      setSessionId(null)
      setConnectionError(null)
      return
    }

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
    }

    console.log(`Attempting to disconnect session: ${sessionId}...`)
  }, [connectionStatus, sessionId])

  const handleSend = useCallback(async () => {
    if (chatStatus === "loading") {
      console.warn("handleSend called while already loading")
      return
    }

    const messageToSend = input.trim()
    if (!messageToSend) return

    const userMessage: CoreMessage = {
      role: "user",
      content: messageToSend,
    }
    const messagesToSend: CoreMessage[] = [...messages, userMessage]

    setMessages((prevMessages) => [...prevMessages, userMessage])
    setInput("")
    setChatStatus("loading")
    setChatError(null)

    try {
      const result = await sendChatMCP(sessionId, messagesToSend)

      if (result.error) {
        console.error("Chat API error:", result.error)
        setChatStatus("error")
        setChatError(result.error)
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant",
            content: `Error: ${result.error}`,
          },
        ])
        return
      }

      if (!result.response) {
        console.error("Chat API returned undefined response without error")
        setChatStatus("error")
        setChatError("Recieved an empty response from the assistant")
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant",
            content: "Empty response received",
          },
        ])
        return
      }

      console.log("Chat response received:", result.response)

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: result.response!,
        },
      ])
      setChatStatus("idle")
      setChatError(null)
    } catch (err) {
      console.error("Exception during chat action call:", err)
      setChatStatus("error")
      setChatError("Exception during chat action call")
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: "I encountered an error" },
      ])
    }
  }, [connectionStatus, sessionId, input, context, messages, chatStatus])

  const value: AIChatContextType = {
    messages,
    input,
    context,
    setContext,
    sessionId,
    connectionStatus,
    connectionError,
    chatStatus,
    chatError,
    handleInputChange,
    handleSend,
    handleNewChat,
    handleConnect,
    handleDisconnect,
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
