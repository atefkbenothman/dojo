"use client"

import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { errorToastStyle, successToastStyle } from "@/lib/styles"
import { useSession } from "@/providers/session-provider"
import { useAuthToken } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { env } from "@dojo/env/frontend"
import { useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"

interface GenerateAgentParams {
  name: string
  prompt: string
  modelId: string
}

interface GenerateWorkflowParams {
  name: string
  prompt: string
  modelId: string
}

export function useGeneration() {
  const router = useRouter()
  const authToken = useAuthToken()
  const { currentSession } = useSession()
  const { play } = useSoundEffectContext()

  // Subscribe to active generation executions
  const activeAgentGeneration = useQuery(api.agentGenerationExecutions.getActiveExecution, authToken ? {} : "skip")
  const activeWorkflowGeneration = useQuery(
    api.workflowGenerationExecutions.getActiveExecution,
    authToken ? {} : "skip",
  )

  // Derive loading states from Convex data
  const isGeneratingAgent = useMemo(() => {
    return activeAgentGeneration?.status === "running"
  }, [activeAgentGeneration])

  const isGeneratingWorkflow = useMemo(() => {
    return activeWorkflowGeneration?.status === "running"
  }, [activeWorkflowGeneration])

  const generateAgent = useCallback(
    async ({ name, prompt, modelId }: GenerateAgentParams) => {
      if (!currentSession) {
        toast.error("Session not ready. Please wait a moment and try again.", {
          icon: null,
          id: "generation-session-not-ready",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return { success: false }
      }

      if (!authToken) {
        toast.error("Authentication required to generate agents with AI", {
          icon: null,
          id: "generation-auth-required",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return { success: false }
      }

      try {
        const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/api/generate/agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            prompt: `Create an AI agent named "${name}" with the following purpose: ${prompt}`,
            generation: {
              modelId,
            },
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to generate agent")
        }

        // Success
        play("./sounds/save.mp3", { volume: 0.5 })
        toast.success("Agent generated successfully!", {
          icon: null,
          id: "generate-agent-success",
          duration: 3000,
          position: "bottom-center",
          style: successToastStyle,
        })

        // Navigate to the new agent
        if (data.agentId) {
          router.push(`/agent?id=${data.agentId}`)
        }

        return { success: true, agentId: data.agentId }
      } catch (error) {
        play("./sounds/error.mp3", { volume: 0.5 })
        const errorMessage = error instanceof Error ? error.message : "Failed to generate agent"
        toast.error(`Generation failed: ${errorMessage}`, {
          icon: null,
          id: "generate-agent-error",
          duration: 5000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        return { success: false, error: errorMessage }
      }
    },
    [authToken, currentSession, play, router],
  )

  const generateWorkflow = useCallback(
    async ({ name, prompt, modelId }: GenerateWorkflowParams) => {
      if (!currentSession) {
        toast.error("Session not ready. Please wait a moment and try again.", {
          icon: null,
          id: "generation-session-not-ready",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return { success: false }
      }

      if (!authToken) {
        toast.error("Authentication required to generate workflows with AI", {
          icon: null,
          id: "generation-auth-required",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return { success: false }
      }

      try {
        const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/api/generate/workflow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            prompt: `Create a workflow named "${name}" that ${prompt}`,
            generation: {
              modelId,
            },
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to generate workflow")
        }

        // Success
        play("./sounds/save.mp3", { volume: 0.5 })
        toast.success("Workflow generated successfully!", {
          icon: null,
          id: "generate-workflow-success",
          duration: 3000,
          position: "bottom-center",
          style: successToastStyle,
        })

        // Navigate to the new workflow
        if (data.workflowId) {
          router.push(`/workflow?id=${data.workflowId}`)
        }

        return { success: true, workflowId: data.workflowId }
      } catch (error) {
        play("./sounds/error.mp3", { volume: 0.5 })
        const errorMessage = error instanceof Error ? error.message : "Failed to generate workflow"
        toast.error(`Generation failed: ${errorMessage}`, {
          icon: null,
          id: "generate-workflow-error",
          duration: 5000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        return { success: false, error: errorMessage }
      }
    },
    [authToken, currentSession, play, router],
  )

  return {
    generateAgent,
    generateWorkflow,
    isGeneratingAgent,
    isGeneratingWorkflow,
    // Additional data for UI
    activeAgentGeneration,
    activeWorkflowGeneration,
  }
}
