"use client"

import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useChatProvider } from "@/hooks/use-chat"
import { useMCP } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useModelStore } from "@/store/use-model-store"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow } from "@dojo/db/convex/types"
import { Message } from "ai"
import { useQuery } from "convex/react"
import { nanoid } from "nanoid"
import { useCallback, useMemo } from "react"

export function useWorkflow() {
  const setSelectedModelId = useModelStore((state) => state.setSelectedModelId)

  const { play } = useSoundEffectContext()
  const { append, setMessages } = useChatProvider()
  const { agents } = useAgent()
  const { connect } = useMCP()
  const { getModel } = useAIModels()

  const workflows = useQuery(api.workflows.list)

  const runWorkflow = useCallback(
    async (workflow: Workflow) => {
      setSelectedModelId(workflow.aiModelId)
      setMessages([
        {
          id: nanoid(),
          role: "system",
          content: workflow.instructions,
        },
        {
          id: nanoid(),
          role: "assistant",
          content: `Starting workflow ${workflow.name}`,
        },
      ])
      const model = getModel(workflow.aiModelId)
      if (!model) {
        throw new Error(`Model with id ${workflow.aiModelId} not found`)
      }
      // connect to mcp servers
      const mcpServers = workflow.steps.map((step) => agents.find((a) => a._id === step)?.mcpServers).flat()
      await connect(mcpServers as Id<"mcp">[])
      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: workflow.instructions,
      }
      append(userMessage, {
        body: {
          interactionType: "workflow",
          workflow: {
            modelId: workflow.aiModelId,
            workflowId: workflow._id,
          },
        },
      })
      play("./sounds/chat.mp3", { volume: 0.5 })
    },
    [append, agents, getModel, play, setMessages, setSelectedModelId, connect],
  )

  const stableWorkflows = useMemo(() => workflows || [], [workflows])

  return {
    workflows: stableWorkflows,
    runWorkflow,
  }
}
