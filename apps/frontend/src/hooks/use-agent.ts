"use client"

import { useSoundEffectContext } from "./use-sound-effect"
import { useChatProvider } from "@/hooks/use-chat"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useMCP } from "@/hooks/use-mcp"
import { useUser } from "@/hooks/use-user"
import { GUEST_SESSION_KEY } from "@/lib/constants"
import { errorToastStyle } from "@/lib/styles"
import { useAuthToken } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Agent } from "@dojo/db/convex/types"
import { env } from "@dojo/env/frontend"
import { Message } from "ai"
import { useMutation, useQuery } from "convex/react"
import { nanoid } from "nanoid"
import { useCallback, useMemo, useState, useEffect } from "react"
import { toast } from "sonner"

export function useAgent() {
  const authToken = useAuthToken()
  const { connect } = useMCP()
  const { play } = useSoundEffectContext()
  const { append, setMessages } = useChatProvider()
  const { currentSession } = useUser()
  const { readStorage } = useLocalStorage()

  const guestSessionId = useMemo(() => {
    return !authToken ? readStorage<string>(GUEST_SESSION_KEY) : null
  }, [authToken, readStorage])

  const agents = useQuery(api.agents.list)
  const create = useMutation(api.agents.create)
  const edit = useMutation(api.agents.edit)
  const remove = useMutation(api.agents.remove)

  // Subscribe to agent executions for real-time updates
  const agentExecutions = useQuery(
    api.agentExecutions.getBySession,
    currentSession ? { sessionId: currentSession._id } : "skip",
  )

  // Local state for optimistic updates during agent preparation
  const [preparingAgents, setPreparingAgents] = useState<Set<string>>(new Set())

  // Clear optimistic state when real execution appears
  useEffect(() => {
    if (!agentExecutions || preparingAgents.size === 0) return

    // Check each preparing agent to see if it now has a real execution
    preparingAgents.forEach((agentId) => {
      const hasRealExecution = agentExecutions.some(
        (exec) => exec.agentId === agentId && (exec.status === "preparing" || exec.status === "running"),
      )

      if (hasRealExecution) {
        setPreparingAgents((prev) => {
          const next = new Set(prev)
          next.delete(agentId)
          return next
        })
      }
    })
  }, [agentExecutions, preparingAgents])

  const runAgent = useCallback(
    async (agent: Agent) => {
      // Check if session is ready before attempting to run agent
      if (!currentSession) {
        toast.error("Session not ready. Please wait a moment and try again.", {
          icon: null,
          id: "agent-session-not-ready",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return
      }

      // Check if agent has a model configured
      if (!agent.aiModelId) {
        toast.error("Agent does not have an AI model configured.", {
          icon: null,
          id: "agent-no-model",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return
      }

      // Set optimistic preparing state
      setPreparingAgents((prev) => new Set(prev).add(agent._id))

      // setMessages((prev) => [
      //   ...prev,
      //   {
      //     id: nanoid(),
      //     role: "assistant",
      //     content: `Starting agent ${agent.name}`,
      //   },
      // ])

      // Handle MCP server connections if needed
      if (agent.mcpServers.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "assistant",
            content: "Connecting to MCP servers...",
          },
        ])

        try {
          await connect(agent.mcpServers)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to connect to MCP servers"

          // Clear optimistic state
          setPreparingAgents((prev) => {
            const next = new Set(prev)
            next.delete(agent._id)
            return next
          })

          toast.error(`MCP Connection Error: ${errorMessage}`, {
            icon: null,
            id: `agent-mcp-error-${agent._id}`,
            duration: 5000,
            position: "bottom-center",
            style: errorToastStyle,
          })
          play("./sounds/error.mp3", { volume: 0.5 })
          return
        }
      }

      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: agent.systemPrompt,
      }

      // Append message - backend will handle execution tracking
      try {
        await append(userMessage, {
          body: {
            interactionType: "agent",
            agent: {
              agentId: agent._id,
            },
          },
        })

        // Clear optimistic state once backend takes over
        setPreparingAgents((prev) => {
          const next = new Set(prev)
          next.delete(agent._id)
          return next
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Agent execution failed"

        // Clear optimistic state
        setPreparingAgents((prev) => {
          const next = new Set(prev)
          next.delete(agent._id)
          return next
        })

        toast.error(`Agent Error: ${errorMessage}`, {
          icon: null,
          id: `agent-error-${agent._id}`,
          duration: 5000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
      }

      play("./sounds/chat.mp3", { volume: 0.5 })
    },
    [append, connect, play, setMessages, currentSession],
  )

  const stopAgent = async (agentId: string) => {
    if (!currentSession) return

    const execution = getAgentExecution(agentId as Id<"agents">)
    if (!execution || execution._id === "preparing") return

    try {
      // Call the stop endpoint
      const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/api/agent/execution/${execution._id}/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(guestSessionId ? { "X-Guest-Session-ID": guestSessionId } : {}),
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to stop agent: ${response.statusText}`)
      }

      // Clear optimistic state if any
      setPreparingAgents((prev) => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })

      play("./sounds/disconnect.mp3", { volume: 0.5 })
    } catch (error) {
      console.error("Failed to stop agent:", error)
      toast.error("Failed to stop agent", {
        icon: null,
        duration: 3000,
        position: "bottom-center",
        style: errorToastStyle,
      })
    }
  }

  const stopAllAgents = async () => {
    if (!currentSession) return

    const runningExecutions = getRunningExecutions()
    if (runningExecutions.length === 0) return

    try {
      // Call stop endpoint for all running executions
      await Promise.all(
        runningExecutions.map(async (execution) => {
          const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/api/agent/execution/${execution._id}/stop`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
              ...(guestSessionId ? { "X-Guest-Session-ID": guestSessionId } : {}),
            },
          })

          if (!response.ok) {
            console.error(`Failed to stop execution ${execution._id}:`, response.statusText)
          }
        }),
      )

      // Clear all optimistic states
      setPreparingAgents(new Set())

      // Play sound once - following MCP's disconnectAll pattern
      play("./sounds/disconnect.mp3", { volume: 0.5 })
    } catch (error) {
      console.error("Failed to stop all agents:", error)
      toast.error("Failed to stop some agents", {
        icon: null,
        duration: 3000,
        position: "bottom-center",
        style: errorToastStyle,
      })
    }
  }

  const stableAgents = useMemo(() => agents || [], [agents])

  // Helper function to get active execution for an agent
  const getAgentExecution = useCallback(
    (agentId: Id<"agents">) => {
      // First check if we have a real execution from Convex
      const realExecution =
        agentExecutions?.find(
          (exec) => exec.agentId === agentId && (exec.status === "preparing" || exec.status === "running"),
        ) || null

      // Only use optimistic state if there's no real execution yet
      if (!realExecution && preparingAgents.has(agentId)) {
        return {
          _id: "preparing",
          agentId,
          status: "preparing" as const,
          sessionId: currentSession?._id,
          startedAt: Date.now(),
          aiModelId: agents?.find((a) => a._id === agentId)?.aiModelId,
          mcpServerIds: [],
          error: undefined,
        }
      }

      return realExecution
    },
    [agentExecutions, preparingAgents, currentSession, agents],
  )

  // Helper function to get all running executions
  const getRunningExecutions = useCallback(() => {
    if (!agentExecutions) return []
    return agentExecutions.filter((exec) => exec.status === "preparing" || exec.status === "running")
  }, [agentExecutions])

  return {
    agents: stableAgents,
    runAgent,
    create,
    edit,
    remove,
    // Agent control functions
    stopAgent,
    stopAllAgents,
    // New direct Convex helpers
    getAgentExecution,
    getRunningExecutions,
    agentExecutions,
  }
}
