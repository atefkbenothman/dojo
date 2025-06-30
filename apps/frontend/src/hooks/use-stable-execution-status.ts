import { WorkflowExecution } from "@dojo/db/convex/types"
import { useMemo, useRef } from "react"

export type NodeExecutionStatus = "pending" | "connecting" | "running" | "completed" | "failed" | "cancelled"

/**
 * Creates a stable execution status mapping that only changes when execution data actually changes
 */
export function useStableExecutionStatus(execution: WorkflowExecution | undefined) {
  const prevExecutionRef = useRef<WorkflowExecution | undefined>(undefined)
  const prevStatusMapRef = useRef<Record<string, NodeExecutionStatus>>({})

  // Create stable mapping of nodeId to execution status
  const executionStatusMap = useMemo(() => {
    // If no execution data, return empty map
    if (!execution || !("nodeExecutions" in execution) || !execution.nodeExecutions) {
      prevExecutionRef.current = execution
      prevStatusMapRef.current = {}
      return {}
    }

    // Check if execution data has actually changed
    const hasChanged =
      prevExecutionRef.current !== execution ||
      prevExecutionRef.current?.status !== execution.status ||
      prevExecutionRef.current?.nodeExecutions?.length !== execution.nodeExecutions.length ||
      execution.nodeExecutions.some((ne, index) => {
        const prevNe = prevExecutionRef.current?.nodeExecutions?.[index]
        return !prevNe || prevNe.nodeId !== ne.nodeId || prevNe.status !== ne.status
      })

    // If nothing changed, return the previous map to maintain reference equality
    if (!hasChanged && prevStatusMapRef.current) {
      return prevStatusMapRef.current
    }

    // Create new status map
    const statusMap: Record<string, NodeExecutionStatus> = {}
    execution.nodeExecutions.forEach((nodeExecution) => {
      statusMap[nodeExecution.nodeId] = nodeExecution.status || "pending"
    })

    // Update refs
    prevExecutionRef.current = execution
    prevStatusMapRef.current = statusMap

    return statusMap
  }, [execution])

  // Return a stable function that looks up status
  const getNodeExecutionStatus = useMemo(() => {
    return (nodeId: string): NodeExecutionStatus => {
      return executionStatusMap[nodeId] || "pending"
    }
  }, [executionStatusMap])

  return { executionStatusMap, getNodeExecutionStatus }
}
