"use client"

import { useSoundEffectContext } from "./use-sound-effect"
import { useChatProvider } from "@/hooks/use-chat"
import { useMCP } from "@/hooks/use-mcp"
import { useUser } from "@/hooks/use-user"
import { errorToastStyle } from "@/lib/styles"
import { useAuthToken } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Agent } from "@dojo/db/convex/types"
import { env } from "@dojo/env/frontend"
import { Message } from "ai"
import { useMutation, useQuery } from "convex/react"
import { nanoid } from "nanoid"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"

// ============= Agent Types & Constants =============
export const AGENT_STATUS = {
  PREPARING: "preparing",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS]

export const AGENT_OUTPUT_TYPE = {
  TEXT: "text",
  OBJECT: "object",
} as const

export type AgentOutputType = (typeof AGENT_OUTPUT_TYPE)[keyof typeof AGENT_OUTPUT_TYPE]

export interface AgentExecution {
  agentId: string
  status: AgentStatus
  error?: string
}

export const isAgentRunning = (status?: AgentStatus | null): boolean => {
  return status === AGENT_STATUS.PREPARING || status === AGENT_STATUS.RUNNING
}

export const isAgentError = (status?: AgentStatus | null): boolean => {
  return status === AGENT_STATUS.FAILED
}

export const canRunAgent = (agent: Agent, isAuthenticated: boolean, currentStatus?: AgentStatus | null): boolean => {
  if (isAgentRunning(currentStatus)) return false
  if (!agent.isPublic && !isAuthenticated) return false
  return true
}

export function useAgent() {
  const authToken = useAuthToken()
  const { connect } = useMCP()
  const { play } = useSoundEffectContext()
  const { append, setMessages } = useChatProvider()
  const { currentSession } = useUser()

  const guestSessionId = useMemo(() => {
    return !authToken && currentSession?.clientSessionId ? currentSession.clientSessionId : null
  }, [authToken, currentSession])

  const agents = useQuery(api.agents.list)
  const create = useMutation(api.agents.create)
  const edit = useMutation(api.agents.edit)
  const remove = useMutation(api.agents.remove)
  const cloneAgent = useMutation(api.agents.clone)

  // Subscribe to agent executions for real-time updates
  const agentExecutions = useQuery(
    api.agentExecutions.getBySession,
    currentSession ? { sessionId: currentSession._id } : "skip",
  )

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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Agent execution failed"

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

  const stopAllAgents = async () => {
    if (!currentSession) return

    const runningExecutions = agentExecutions?.filter((exec) => isAgentRunning(exec.status)) || []

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
        agentExecutions?.find((exec) => exec.agentId === agentId && isAgentRunning(exec.status)) || null

      return realExecution
    },
    [agentExecutions],
  )

  const clone = async (id: string) => {
    try {
      await cloneAgent({ id: id as Id<"agents"> })
      play("./sounds/connect.mp3", { volume: 0.5 })
      toast.success("Agent cloned successfully!", {
        icon: null,
        id: "clone-agent-success",
        duration: 3000,
        position: "bottom-center",
      })
    } catch (error) {
      play("./sounds/error.mp3", { volume: 0.5 })
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error(`Failed to clone agent: ${errorMessage}`, {
        icon: null,
        id: "clone-agent-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      throw error
    }
  }

  return {
    agents: stableAgents,
    runAgent,
    create,
    edit,
    remove,
    clone,
    // Agent control functions
    stopAllAgents,
    // Direct Convex helpers
    getAgentExecution,
  }
}
