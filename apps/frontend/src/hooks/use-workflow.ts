"use client"

import { useChatProvider } from "@/hooks/use-chat"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { errorToastStyle } from "@/lib/styles"
import { useSession } from "@/providers/session-provider"
import { useAuthToken } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow } from "@dojo/db/convex/types"
import { env } from "@dojo/env/frontend"
import { Message } from "ai"
import { useMutation } from "convex/react"
import { nanoid } from "nanoid"
import { useCallback, useMemo, useEffect, useState, useRef } from "react"
import { toast } from "sonner"

export function useWorkflow() {
  const authToken = useAuthToken()
  const { play } = useSoundEffectContext()
  const { append, setMessages } = useChatProvider()
  const { currentSession } = useSession()

  // Use refs to stabilize callbacks while still accessing current values
  const currentSessionRef = useRef(currentSession)
  const appendRef = useRef(append)
  const setMessagesRef = useRef(setMessages)

  // Update refs when values change - only update when session ID changes, not entire object
  useEffect(() => {
    currentSessionRef.current = currentSession
    appendRef.current = append
    setMessagesRef.current = setMessages
  }, [currentSession?._id, append, setMessages])

  const create = useMutation(api.workflows.create)
  const edit = useMutation(api.workflows.edit)
  const remove = useMutation(api.workflows.remove)
  const cloneWorkflow = useMutation(api.workflows.clone)

  // Local state for optimistic updates during workflow preparation
  const [preparingWorkflows, setPreparingWorkflows] = useState<Set<Id<"workflows">>>(new Set())

  const runWorkflow = useCallback(
    async (workflow: Workflow) => {
      // Check if session is ready before attempting to run workflow
      if (!currentSessionRef.current) {
        toast.error("Session not ready. Please wait a moment and try again.", {
          icon: null,
          id: "workflow-session-not-ready",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return
      }

      // Check if workflow has a root node (tree structure)
      if (!workflow.rootNodeId) {
        toast.error("Workflow is not properly configured.", {
          icon: null,
          id: "workflow-no-nodes",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return
      }

      // Set optimistic preparing state
      setPreparingWorkflows((prev) => new Set(prev).add(workflow._id))

      setMessagesRef.current([
        {
          id: nanoid(),
          role: "system",
          content: workflow.instructions,
        },
      ])

      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: workflow.instructions,
      }

      // Append message - backend will handle execution tracking
      try {
        await appendRef.current(userMessage, {
          body: {
            interactionType: "workflow",
            workflow: {
              workflowId: workflow._id,
            },
          },
        })

        // Clear optimistic state once backend takes over
        setPreparingWorkflows((prev) => {
          const next = new Set(prev)
          next.delete(workflow._id)
          return next
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Workflow execution failed"

        // Clear optimistic state
        setPreparingWorkflows((prev) => {
          const next = new Set(prev)
          next.delete(workflow._id)
          return next
        })

        toast.error(`Workflow Error: ${errorMessage}`, {
          icon: null,
          id: `workflow-error-${workflow._id}`,
          duration: 5000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
      }

      play("./sounds/chat.mp3", { volume: 0.5 })
    },
    [play],
  )

  const headers = useMemo(() => {
    const result = {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(currentSession?.clientSessionId ? { "X-Guest-Session-ID": currentSession.clientSessionId } : {}),
    }
    return result
  }, [authToken, currentSession?.clientSessionId])

  const stopWorkflow = useCallback(
    async (workflowId: Id<"workflows">, executionId?: string) => {
      if (!currentSessionRef.current || !executionId) return

      try {
        // Call the stop endpoint
        const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/api/workflow/execution/${executionId}/stop`, {
          method: "POST",
          headers,
        })

        if (!response.ok) {
          throw new Error(`Failed to stop workflow: ${response.statusText}`)
        }

        // Clear optimistic state if any
        setPreparingWorkflows((prev) => {
          const next = new Set(prev)
          next.delete(workflowId)
          return next
        })

        // Show cancelling toast
        toast.info("Cancelling workflow...", {
          icon: null,
          duration: 3000,
          position: "bottom-center",
        })

        play("./sounds/disconnect.mp3", { volume: 0.5 })
      } catch (error) {
        console.error("Failed to stop workflow:", error)
        toast.error("Failed to stop workflow", {
          icon: null,
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
      }
    },
    [headers, play],
  )

  const stopAllWorkflows = useCallback(
    async (runningExecutions: Array<{ _id: string }>) => {
      if (!currentSessionRef.current || runningExecutions.length === 0) return

      try {
        // Call stop endpoint for all running executions
        await Promise.all(
          runningExecutions.map(async (execution) => {
            const response = await fetch(
              `${env.NEXT_PUBLIC_BACKEND_URL}/api/workflow/execution/${execution._id}/stop`,
              {
                method: "POST",
                headers,
              },
            )

            if (!response.ok) {
              console.error(`Failed to stop execution ${execution._id}:`, response.statusText)
            }
          }),
        )

        setPreparingWorkflows(new Set())
        play("./sounds/disconnect.mp3", { volume: 0.5 })
      } catch (error) {
        console.error("Failed to stop all workflows:", error)
        toast.error("Failed to stop some workflows", {
          icon: null,
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
      }
    },
    [headers, play],
  )

  const clone = useCallback(
    async (id: string) => {
      try {
        await cloneWorkflow({ id: id as Id<"workflows"> })
        play("./sounds/connect.mp3", { volume: 0.5 })
        toast.success("Workflow cloned successfully!", {
          icon: null,
          id: "clone-workflow-success",
          duration: 3000,
          position: "bottom-center",
        })
      } catch (error) {
        play("./sounds/error.mp3", { volume: 0.5 })
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
        toast.error(`Failed to clone workflow: ${errorMessage}`, {
          icon: null,
          id: "clone-workflow-error",
          duration: 5000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        throw error
      }
    },
    [cloneWorkflow, play],
  )

  return {
    create,
    edit,
    remove,
    clone,
    runWorkflow,
    stopWorkflow,
    stopAllWorkflows,
  }
}
