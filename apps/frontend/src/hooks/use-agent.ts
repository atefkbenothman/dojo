"use client"

import { useSoundEffectContext } from "./use-sound-effect"
import { useAIModels } from "@/hooks/use-ai-models"
import { useChatProvider } from "@/hooks/use-chat"
import { useMCP } from "@/hooks/use-mcp"
import { api } from "@dojo/db/convex/_generated/api"
import { Agent } from "@dojo/db/convex/types"
import { Message } from "ai"
import { useQuery } from "convex/react"
import { nanoid } from "nanoid"
import { useCallback, useMemo } from "react"

export function useAgent() {
  const { connect } = useMCP()
  const { play } = useSoundEffectContext()
  const { append, setMessages } = useChatProvider()
  const { selectedModel } = useAIModels()

  const agents = useQuery(api.agents.list)

  const runAgent = useCallback(
    async (agent: Agent) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: `Starting agent ${agent.name}`,
        },
      ])
      if (agent.mcpServers.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "assistant",
            content: "Connecting to MCP servers...",
          },
        ])
        await connect(agent.mcpServers)
      }
      if (!selectedModel) return
      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: agent.systemPrompt,
      }
      append(userMessage, {
        body: {
          interactionType: "agent",
          agent: {
            modelId: selectedModel._id,
            agentId: agent._id,
          },
        },
      })
      play("./sounds/chat.mp3", { volume: 0.5 })
    },
    [selectedModel, append, connect, play, setMessages],
  )

  const stableAgents = useMemo(() => agents || [], [agents])

  return {
    agents: stableAgents,
    runAgent,
  }
}
