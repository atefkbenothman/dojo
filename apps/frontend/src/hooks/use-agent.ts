"use client"

import { useSoundEffectContext } from "./use-sound-effect"
import { useAIModels } from "@/hooks/use-ai-models"
import { useChatProvider } from "@/hooks/use-chat"
import { useMCP } from "@/hooks/use-mcp"
import { useUser } from "@/hooks/use-user"
import { errorToastStyle } from "@/lib/styles"
import { useAgentStore } from "@/store/use-agent-store"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Agent } from "@dojo/db/convex/types"
import { Message } from "ai"
import { useMutation, useQuery } from "convex/react"
import { nanoid } from "nanoid"
import { useCallback, useMemo, useEffect } from "react"
import { toast } from "sonner"

export function useAgent() {
  const { connect } = useMCP()
  const { play } = useSoundEffectContext()
  const { append, setMessages } = useChatProvider()
  const { selectedModel } = useAIModels()
  const { currentSession } = useUser()

  // Agent store integration
  const {
    setAgentStatus,
    setAgentError,
    setAgentProgress,
    setAgentMeta,
    clearAgentMeta,
    clearAllAgentMeta,
    getAgentStatus,
    getAgentError,
    getAgentProgress,
    getRunningAgents,
  } = useAgentStore()

  const agents = useQuery(api.agents.list)
  const create = useMutation(api.agents.create)
  const edit = useMutation(api.agents.edit)
  const remove = useMutation(api.agents.remove)

  // Session mutations for tracking running agents
  const addRunningAgent = useMutation(api.sessions.addRunningAgent)
  const removeRunningAgent = useMutation(api.sessions.removeRunningAgent)
  const clearRunningAgents = useMutation(api.sessions.clearRunningAgents)

  // Sync agent state from session
  useEffect(() => {
    if (!currentSession || !agents) return

    const sessionAgentIds = currentSession.runningAgentIds || []

    // Mark agents as running if they're in the session
    sessionAgentIds.forEach((agentId) => {
      const agent = agents.find((a) => a._id === agentId)
      if (agent) {
        setAgentStatus(agentId, "running")
        setAgentProgress(agentId, "Executing agent...")
      }
    })

    // Get all agent IDs to check
    const allAgentIds = agents.map((a) => a._id)

    // Mark agents as idle if they're not in the session
    allAgentIds.forEach((agentId) => {
      if (!sessionAgentIds.includes(agentId)) {
        setAgentStatus(agentId, "idle")
      }
    })
  }, [currentSession, agents, setAgentStatus, setAgentProgress])

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

      // Check if model is selected before starting
      if (!selectedModel) {
        toast.error("Please select an AI model before running the agent.", {
          icon: null,
          id: "agent-no-model",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return
      }

      // Set initial status and clear any previous errors
      setAgentStatus(agent._id, "preparing")
      setAgentError(agent._id, null)
      setAgentProgress(agent._id, null)

      // Add agent to session's running agents
      try {
        await addRunningAgent({
          sessionId: currentSession._id,
          agentId: agent._id,
        })
      } catch (error) {
        console.error("Failed to add running agent to session:", error)
        // Continue anyway - this is not critical for agent execution
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: `Starting agent ${agent.name}`,
        },
      ])

      // Handle MCP server connections if needed
      if (agent.mcpServers.length > 0) {
        setAgentProgress(agent._id, "Connecting to MCP servers...")
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
          setAgentStatus(agent._id, "error")
          setAgentError(agent._id, errorMessage)

          // Remove from running agents
          try {
            await removeRunningAgent({
              sessionId: currentSession._id,
              agentId: agent._id,
            })
          } catch (removeError) {
            console.error("Failed to remove running agent from session:", removeError)
          }

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

      // Update status to running
      setAgentStatus(agent._id, "running")
      setAgentProgress(agent._id, "Executing agent...")

      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: agent.systemPrompt,
      }

      // Append message - completion will be handled by chat callbacks
      try {
        await append(userMessage, {
          body: {
            interactionType: "agent",
            agent: {
              modelId: selectedModel._id,
              agentId: agent._id,
            },
          },
        })
        // Note: We can't track completion here directly as append doesn't provide callbacks
        // The chat provider's onFinish/onError will handle the overall chat state
        // For now, we'll reset to idle after append completes
        setAgentStatus(agent._id, "idle")
        setAgentProgress(agent._id, null)

        // Remove from running agents
        try {
          await removeRunningAgent({
            sessionId: currentSession._id,
            agentId: agent._id,
          })
        } catch (removeError) {
          console.error("Failed to remove running agent from session:", removeError)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Agent execution failed"
        setAgentStatus(agent._id, "error")
        setAgentError(agent._id, errorMessage)
        setAgentProgress(agent._id, null)

        // Remove from running agents
        try {
          await removeRunningAgent({
            sessionId: currentSession._id,
            agentId: agent._id,
          })
        } catch (removeError) {
          console.error("Failed to remove running agent from session:", removeError)
        }

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
    [
      selectedModel,
      append,
      connect,
      play,
      setMessages,
      setAgentStatus,
      setAgentError,
      setAgentProgress,
      currentSession,
      addRunningAgent,
      removeRunningAgent,
    ],
  )

  const stopAgent = async (agentId: string) => {
    if (!currentSession) return

    // Update local state immediately
    setAgentStatus(agentId, "idle")
    setAgentProgress(agentId, null)

    // Remove from session
    try {
      await removeRunningAgent({
        sessionId: currentSession._id,
        agentId: agentId as Id<"agents">,
      })
    } catch (error) {
      console.error("Failed to remove running agent from session:", error)
    }

    // No toast notification - following MCP pattern
  }

  const stopAllAgents = async () => {
    if (!currentSession) return

    const runningAgentIds = getRunningAgents()
    if (runningAgentIds.length === 0) return

    // Clear all agent states
    clearAllAgentMeta()

    // Clear from session
    try {
      await clearRunningAgents({
        sessionId: currentSession._id,
      })
    } catch (error) {
      console.error("Failed to clear running agents from session:", error)
    }

    // Play sound once - following MCP's disconnectAll pattern
    play("./sounds/disconnect.mp3", { volume: 0.5 })
  }

  const stableAgents = useMemo(() => agents || [], [agents])

  return {
    agents: stableAgents,
    runAgent,
    create,
    edit,
    remove,
    // Agent status getters
    getAgentStatus,
    getAgentError,
    getAgentProgress,
    getRunningAgents,
    // Agent control functions
    stopAgent,
    stopAllAgents,
  }
}
