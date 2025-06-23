"use client"

import { useAgent } from "@/hooks/use-agent"
import { useChatProvider } from "@/hooks/use-chat"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useMCP } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUser } from "@/hooks/use-user"
import { GUEST_SESSION_KEY } from "@/lib/constants"
import { errorToastStyle, successToastStyle } from "@/lib/styles"
import { useAuthToken } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow } from "@dojo/db/convex/types"
import { env } from "@dojo/env/frontend"
import { Message } from "ai"
import { useQuery, useMutation } from "convex/react"
import { nanoid } from "nanoid"
import { useCallback, useMemo, useEffect, useState, useRef } from "react"
import { toast } from "sonner"

export function useWorkflow() {
  const { play } = useSoundEffectContext()
  const { append, setMessages, stop } = useChatProvider()
  const { agents } = useAgent()
  const { connect } = useMCP()
  const { currentSession } = useUser()
  const authToken = useAuthToken()
  const { readStorage } = useLocalStorage()

  const guestSessionId = useMemo(() => {
    return !authToken ? readStorage<string>(GUEST_SESSION_KEY) : null
  }, [authToken, readStorage])

  const workflows = useQuery(api.workflows.list)
  const create = useMutation(api.workflows.create)
  const edit = useMutation(api.workflows.edit)
  const remove = useMutation(api.workflows.remove)
  const requestCancellation = useMutation(api.workflowExecutions.requestCancellation)

  // Subscribe to workflow executions for real-time updates
  const workflowExecutions = useQuery(
    api.workflowExecutions.getBySession,
    currentSession ? { sessionId: currentSession._id } : "skip",
  )

  // Local state for optimistic updates during workflow preparation
  const [preparingWorkflows, setPreparingWorkflows] = useState<Set<string>>(new Set())

  // Clear optimistic state when real execution appears
  useEffect(() => {
    if (!workflowExecutions || preparingWorkflows.size === 0) return

    // Check each preparing workflow to see if it now has a real execution
    preparingWorkflows.forEach((workflowId) => {
      const hasRealExecution = workflowExecutions.some(
        (exec) => exec.workflowId === workflowId && (exec.status === "preparing" || exec.status === "running"),
      )

      if (hasRealExecution) {
        setPreparingWorkflows((prev) => {
          const next = new Set(prev)
          next.delete(workflowId)
          return next
        })
      }
    })
  }, [workflowExecutions, preparingWorkflows])

  // Track current workflow execution status for toast notifications
  const currentExecutionRef = useRef<{ id: string; status: string } | null>(null)

  // Show toast when workflow execution completes or fails
  useEffect(() => {
    if (!workflowExecutions || !workflows) return

    // Find the most recent running execution
    const runningExecution = workflowExecutions.find((exec) => exec.status === "preparing" || exec.status === "running")

    if (runningExecution) {
      // Update current execution tracking
      currentExecutionRef.current = {
        id: runningExecution._id,
        status: runningExecution.status,
      }
    } else if (currentExecutionRef.current) {
      // Check if our tracked execution finished
      const finishedExecution = workflowExecutions.find(
        (exec) =>
          exec._id === currentExecutionRef.current?.id && (exec.status === "completed" || exec.status === "failed"),
      )

      if (finishedExecution) {
        const workflow = workflows.find((w) => w._id === finishedExecution.workflowId)
        if (workflow) {
          const duration =
            finishedExecution.completedAt && finishedExecution.startedAt
              ? Math.round((finishedExecution.completedAt - finishedExecution.startedAt) / 1000)
              : undefined

          const formatDuration = (seconds: number) => {
            if (seconds < 60) return `${seconds}s`
            const minutes = Math.floor(seconds / 60)
            const remainingSeconds = seconds % 60
            return `${minutes}m ${remainingSeconds}s`
          }

          if (finishedExecution.status === "completed") {
            const message = duration
              ? `${workflow.name} completed in ${formatDuration(duration)}`
              : `${workflow.name} completed`

            toast.success(message, {
              icon: null,
              duration: 5000,
              position: "bottom-center",
              style: successToastStyle,
            })
            play("./sounds/save.mp3", { volume: 0.5 })
          } else if (finishedExecution.status === "failed") {
            const message = finishedExecution.error
              ? `${workflow.name} failed: ${finishedExecution.error}`
              : `${workflow.name} failed`

            toast.error(message, {
              icon: null,
              duration: 7000,
              position: "bottom-center",
              style: errorToastStyle,
            })
            play("./sounds/error.mp3", { volume: 0.5 })
          }
        }

        // Clear tracking since we've shown the toast
        currentExecutionRef.current = null
      }
    }
  }, [workflowExecutions, workflows, play])

  const runWorkflow = useCallback(
    async (workflow: Workflow) => {
      // Check if session is ready before attempting to run workflow
      if (!currentSession) {
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

      // Check if workflow has steps
      if (!workflow.steps || workflow.steps.length === 0) {
        toast.error("Workflow has no steps configured.", {
          icon: null,
          id: "workflow-no-steps",
          duration: 3000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        play("./sounds/error.mp3", { volume: 0.5 })
        return
      }

      // Set optimistic preparing state
      setPreparingWorkflows((prev) => new Set(prev).add(workflow._id))

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

      // Handle MCP server connections if needed
      const mcpServers = workflow.steps
        .map((step) => agents.find((a) => a._id === step)?.mcpServers)
        .flat()
        .filter(Boolean) as Id<"mcp">[]

      if (mcpServers.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "assistant",
            content: "Connecting to MCP servers...",
          },
        ])

        try {
          await connect(mcpServers)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to connect to MCP servers"

          // Clear optimistic state
          setPreparingWorkflows((prev) => {
            const next = new Set(prev)
            next.delete(workflow._id)
            return next
          })

          toast.error(`MCP Connection Error: ${errorMessage}`, {
            icon: null,
            id: `workflow-mcp-error-${workflow._id}`,
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
        content: workflow.instructions,
      }

      // Append message - backend will handle execution tracking
      try {
        await append(userMessage, {
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
    [append, agents, play, setMessages, connect, currentSession],
  )

  const stopWorkflow = async (workflowId: string) => {
    if (!currentSession) return

    const execution = getWorkflowExecution(workflowId as Id<"workflows">)
    if (!execution || !("_id" in execution)) return

    try {
      // Call the stop endpoint
      const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/api/workflow/execution/${execution._id}/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(guestSessionId ? { "X-Guest-Session-ID": guestSessionId } : {}),
        },
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
      toast.info(`Cancelling ${workflows?.find((w) => w._id === workflowId)?.name || "workflow"}...`, {
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
  }

  const stopAllWorkflows = async () => {
    if (!currentSession) return

    const runningExecutions = getRunningExecutions()
    if (runningExecutions.length === 0) return

    try {
      // Call stop endpoint for all running executions
      await Promise.all(
        runningExecutions.map(async (execution) => {
          const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/api/workflow/execution/${execution._id}/stop`, {
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
      setPreparingWorkflows(new Set())

      // Play sound once - following MCP's disconnectAll pattern
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
  }

  const stableWorkflows = useMemo(() => workflows || [], [workflows])

  // Helper function to get the most recent execution for a workflow (for persistence)
  const getWorkflowExecution = useCallback(
    (workflowId: Id<"workflows">) => {
      // First check if we have an active execution from Convex
      const activeExecution =
        workflowExecutions?.find(
          (exec) => exec.workflowId === workflowId && (exec.status === "preparing" || exec.status === "running"),
        ) || null

      // If we have an active execution, return it
      if (activeExecution) {
        return activeExecution
      }

      // Only use optimistic state if there's no real execution yet
      if (preparingWorkflows.has(workflowId)) {
        return {
          workflowId,
          status: "preparing" as const,
          sessionId: currentSession?._id,
          totalSteps: workflows?.find((w) => w._id === workflowId)?.steps.length || 0,
          startedAt: Date.now(),
          error: undefined,
          currentStep: undefined,
        }
      }

      // For persistence: return the most recent completed/failed execution within 12 hours
      const recentExecution = workflowExecutions
        ?.filter((exec) => exec.workflowId === workflowId)
        ?.sort((a, b) => (b.completedAt || b.startedAt) - (a.completedAt || a.startedAt))[0]

      // Only return if completed within last 12 hours
      if (recentExecution && recentExecution.completedAt) {
        const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000
        if (recentExecution.completedAt < twelveHoursAgo) {
          return null
        }
      }

      return recentExecution || null
    },
    [workflowExecutions, preparingWorkflows, workflows, currentSession],
  )

  // Helper function to get all running executions
  const getRunningExecutions = useCallback(() => {
    if (!workflowExecutions) return []
    return workflowExecutions.filter((exec) => exec.status === "preparing" || exec.status === "running")
  }, [workflowExecutions])

  return {
    workflows: stableWorkflows,
    runWorkflow,
    create,
    edit,
    remove,
    // Workflow control functions
    stopWorkflow,
    stopAllWorkflows,
    // New direct Convex helpers
    getWorkflowExecution,
    getRunningExecutions,
    workflowExecutions,
  }
}
