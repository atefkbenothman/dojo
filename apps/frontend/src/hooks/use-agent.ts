"use client"

import { useChatProvider } from "@/hooks/use-chat"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useStableQuery } from "@/hooks/use-stable-query"
import { errorToastStyle } from "@/lib/styles"
import { useSession } from "@/providers/session-provider"
import { useAuthToken } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Agent } from "@dojo/db/convex/types"
import { env } from "@dojo/env/frontend"
import { Message } from "ai"
import { useMutation, useConvex } from "convex/react"
import { nanoid } from "nanoid"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"

export const AGENT_STATUS = {
  PREPARING: "preparing",
  CONNECTING: "connecting",
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
  return status === AGENT_STATUS.PREPARING || status === AGENT_STATUS.CONNECTING || status === AGENT_STATUS.RUNNING
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
  const convex = useConvex()
  const authToken = useAuthToken()
  const { play } = useSoundEffectContext()
  const { append } = useChatProvider()
  const { currentSession } = useSession()

  const agents = useStableQuery(api.agents.list)
  const createAgent = useMutation(api.agents.create)
  const edit = useMutation(api.agents.edit)
  const remove = useMutation(api.agents.remove)
  const cloneAgent = useMutation(api.agents.clone)

  // Subscribe to agent executions for real-time updates
  const agentExecutions = useStableQuery(
    api.agentExecutions.getBySession,
    currentSession ? { sessionId: currentSession._id } : "skip",
  )

  const runAgent = useCallback(
    async (agent: Agent) => {
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
    [append, play],
  )

  const stopAllAgents = async () => {
    if (!currentSession) return

    const runningExecutions = agentExecutions?.filter((exec) => isAgentRunning(exec)) || []

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
              ...(currentSession?.clientSessionId ? { "X-Guest-Session-ID": currentSession.clientSessionId } : {}),
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

  // Helper to check if agent is currently running
  const isAgentRunning = useCallback((execution?: AgentExecution) => {
    return (
      execution?.status === AGENT_STATUS.PREPARING ||
      execution?.status === AGENT_STATUS.CONNECTING ||
      execution?.status === AGENT_STATUS.RUNNING
    )
  }, [])

  // Helper function to get active execution for an agent
  const getAgentExecution = useCallback(
    (agentId: Id<"agents">) => {
      // First check if we have a real execution from Convex
      const realExecution = agentExecutions?.find((exec) => exec.agentId === agentId && isAgentRunning(exec)) || null

      return realExecution
    },
    [agentExecutions, isAgentRunning],
  )

  const removeAgent = async (id: string, force?: boolean) => {
    try {
      await remove({ id: id as Id<"agents">, force })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      play("./sounds/error.mp3", { volume: 0.5 })
      toast.error(`Failed to remove agent: ${errorMessage}`, {
        icon: null,
        id: "remove-agent-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      throw error
    }
  }

  const checkAgentDependencies = async (id: string) => {
    try {
      return await convex.query(api.agents.checkDependencies, { id: id as Id<"agents"> })
    } catch (error) {
      console.error("Failed to check dependencies:", error)
      return null
    }
  }

  const create = async (agent: any) => {
    try {
      const agentId = await createAgent(agent)
      return agentId
    } catch (error) {
      play("./sounds/error.mp3", { volume: 0.5 })
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error(`Failed to create agent: ${errorMessage}`, {
        icon: null,
        id: "create-agent-error",
        duration: 5000,
        position: "bottom-center",
        style: errorToastStyle,
      })
      throw error
    }
  }

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

  const canRun = useCallback((agent: Agent) => {
    return agent.aiModelId ? true : false
  }, [])

  return {
    agents: stableAgents,
    runAgent,
    create,
    edit,
    remove: removeAgent,
    clone,
    // Agent control functions
    stopAllAgents,
    // Direct Convex helpers
    getAgentExecution,
    checkAgentDependencies,
    // Centralized logic helpers
    canRun,
    isAgentRunning,
  }
}
