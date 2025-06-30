"use client"

import { useChatProvider } from "@/hooks/use-chat"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUser } from "@/hooks/use-user"
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

export function useWorkflow(selectedWorkflow?: Workflow | null) {
  const authToken = useAuthToken()
  const { play } = useSoundEffectContext()
  const { append, setMessages } = useChatProvider()
  const { currentSession } = useUser()

  const guestSessionId = useMemo(() => {
    return !authToken && currentSession?.clientSessionId ? currentSession.clientSessionId : null
  }, [authToken, currentSession])

  const workflows = useQuery(api.workflows.list)
  const create = useMutation(api.workflows.create)
  const edit = useMutation(api.workflows.edit)
  const remove = useMutation(api.workflows.remove)
  const cloneWorkflow = useMutation(api.workflows.clone)

  // Query for workflow nodes (tree structure) - use selected workflow
  const selectedWorkflowId = selectedWorkflow?._id

  const nodes = useQuery(
    api.workflows.getWorkflowNodes,
    selectedWorkflowId ? { workflowId: selectedWorkflowId } : "skip",
  )

  // Subscribe to workflow executions for real-time updates
  const workflowExecutions = useQuery(
    api.workflowExecutions.getBySession,
    currentSession ? { sessionId: currentSession._id } : "skip",
  )

  // Local state for optimistic updates during workflow preparation
  const [preparingWorkflows, setPreparingWorkflows] = useState<Set<Id<"workflows">>>(new Set())

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

      setMessages([
        {
          id: nanoid(),
          role: "system",
          content: workflow.instructions,
        },
        // {
        //   id: nanoid(),
        //   role: "assistant",
        //   content: `Starting workflow ${workflow.name}`,
        // },
      ])

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
    [append, play, setMessages, currentSession],
  )

  const stopWorkflow = async (workflowId: Id<"workflows">) => {
    if (!currentSession) return

    const execution = getWorkflowExecution(workflowId)
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
  }

  const stableWorkflows = useMemo(() => workflows || [], [workflows])

  // Create a stable execution map to prevent infinite re-renders
  const executionMap = useMemo(() => {
    const map = new Map<Id<"workflows">, any>()

    if (workflowExecutions) {
      // Group executions by workflow
      const executionsByWorkflow = workflowExecutions.reduce(
        (acc, exec) => {
          if (!acc[exec.workflowId]) {
            acc[exec.workflowId] = []
          }
          acc[exec.workflowId]!.push(exec)
          return acc
        },
        {} as Record<string, typeof workflowExecutions>,
      )

      // For each workflow, determine the current execution
      Object.entries(executionsByWorkflow).forEach(([workflowId, executions]) => {
        const id = workflowId as Id<"workflows">

        // First check for active executions
        const activeExecution = executions.find((exec) => exec.status === "preparing" || exec.status === "running")

        if (activeExecution) {
          map.set(id, activeExecution)
          return
        }

        // Check for optimistic state
        if (preparingWorkflows.has(id) && currentSession?._id) {
          map.set(id, {
            workflowId: id,
            status: "preparing" as const,
            sessionId: currentSession._id,
            totalSteps: 0,
            startedAt: Date.now(),
            error: undefined,
            currentNodes: [],
            nodeExecutions: [],
          })
          return
        }

        // For persistence: get most recent completed/failed execution within 12 hours
        const sortedExecutions = executions.sort(
          (a, b) => (b.completedAt || b.startedAt) - (a.completedAt || a.startedAt),
        )
        const recentExecution = sortedExecutions[0]

        if (recentExecution && recentExecution.completedAt) {
          const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000
          if (recentExecution.completedAt >= twelveHoursAgo) {
            map.set(id, recentExecution)
            return
          }
        }

        map.set(id, recentExecution || null)
      })
    }

    // Add optimistic states for preparing workflows not in the map
    preparingWorkflows.forEach((_, workflowId) => {
      if (!map.has(workflowId) && currentSession?._id) {
        map.set(workflowId, {
          workflowId,
          status: "preparing" as const,
          sessionId: currentSession._id,
          totalSteps: 0,
          startedAt: Date.now(),
          error: undefined,
          currentNodes: [],
          nodeExecutions: [],
        })
      }
    })

    return map
  }, [workflowExecutions, preparingWorkflows, currentSession?._id])

  // Helper function to get the most recent execution for a workflow (for persistence)
  const getWorkflowExecution = useCallback(
    (workflowId: Id<"workflows">) => {
      return executionMap.get(workflowId) || null
    },
    [executionMap],
  )

  // Helper function to get all running executions
  const getRunningExecutions = useCallback(() => {
    if (!workflowExecutions) return []
    return workflowExecutions.filter((exec) => exec.status === "preparing" || exec.status === "running")
  }, [workflowExecutions])

  // Helper function to check if any node is currently connecting
  const hasConnectingNodes = useCallback(
    (workflowId: Id<"workflows">) => {
      const execution = executionMap.get(workflowId)
      if (!execution || !("nodeExecutions" in execution) || !execution.nodeExecutions) {
        return false
      }

      return execution.nodeExecutions.some((node: any) => node.status === "connecting")
    },
    [executionMap],
  )

  // Helper function to get node-level execution status
  const getNodeExecutionStatus = useCallback(
    (workflowId: Id<"workflows">, nodeId: string) => {
      const execution = executionMap.get(workflowId)
      if (!execution || !("nodeExecutions" in execution) || !execution.nodeExecutions) {
        return "pending"
      }

      const nodeExecution = execution.nodeExecutions.find((node: any) => node.nodeId === nodeId)
      return nodeExecution?.status || "pending"
    },
    [executionMap],
  )

  const clone = async (id: string) => {
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
  }

  return {
    workflows: stableWorkflows,
    runWorkflow,
    create,
    edit,
    remove,
    clone,
    // Workflow control functions
    stopWorkflow,
    stopAllWorkflows,
    // New direct Convex helpers
    getWorkflowExecution,
    getRunningExecutions,
    workflowExecutions,
    // Node-level execution helpers
    hasConnectingNodes,
    getNodeExecutionStatus,
    // Tree structure data
    workflowNodes: nodes,
  }
}
