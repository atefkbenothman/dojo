"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Agent, WorkflowExecution, Workflow } from "@dojo/db/convex/types"
import { CheckCircle, XCircle, Circle, Loader2, Copy, ChevronDown, AlertTriangle, Square } from "lucide-react"
import { memo, useState, useCallback, useRef, useEffect } from "react"

interface WorkflowExecutionViewProps {
  workflow: Workflow
  execution: WorkflowExecution
  agents: Agent[]
  workflowSteps: string[]
  onStop?: () => void
}

type StepStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

export const WorkflowExecutionView = memo(function WorkflowExecutionView({
  workflow,
  execution,
  agents,
  workflowSteps,
  onStop,
}: WorkflowExecutionViewProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
  const viewportRef = useRef<HTMLDivElement>(null)

  // Get agent by ID
  const getAgent = (agentId: string) => agents.find((agent) => agent._id === agentId)

  // Get step status
  const getStepStatus = (stepIndex: number): StepStatus => {
    if (!execution.stepExecutions) {
      if (execution.currentStep === undefined) return "pending"
      if (stepIndex < execution.currentStep) return "completed"
      if (stepIndex === execution.currentStep) {
        return execution.status === "running" ? "running" : "pending"
      }
      return "pending"
    }

    const stepExecution = execution.stepExecutions.find((se) => se.stepIndex === stepIndex)
    return (stepExecution?.status || "pending") as StepStatus
  }

  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  // Get step duration
  const getStepDuration = (stepIndex: number): string | null => {
    if (!execution.stepExecutions) return null

    const stepExecution = execution.stepExecutions.find((se) => se.stepIndex === stepIndex)
    if (!stepExecution?.startedAt) return null

    const endTime = stepExecution.completedAt || Date.now()
    return formatDuration(endTime - stepExecution.startedAt)
  }

  // Toggle step expansion
  const toggleStepExpansion = useCallback((stepIndex: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepIndex)) {
        next.delete(stepIndex)
      } else {
        next.add(stepIndex)
      }
      return next
    })
  }, [])

  // Auto-expand rules
  const shouldAutoExpand = (stepIndex: number, status: StepStatus): boolean => {
    return status === "running" || status === "failed"
  }

  // Apply auto-expansion
  useEffect(() => {
    const newExpanded = new Set<number>()

    workflowSteps.forEach((_, index) => {
      const status = getStepStatus(index)
      if (shouldAutoExpand(index, status)) {
        newExpanded.add(index)
      }
    })

    setExpandedSteps(newExpanded)
  }, [execution.currentStep, execution.stepExecutions])

  // Calculate overall progress
  const completedSteps = execution.stepExecutions?.filter((se) => se.status === "completed").length || 0
  const progressPercentage = execution.totalSteps > 0 ? (completedSteps / execution.totalSteps) * 100 : 0

  // Get overall execution time
  const getOverallDuration = () => {
    if (!execution.startedAt) return "0s"
    const endTime = execution.completedAt || Date.now()
    return formatDuration(endTime - execution.startedAt)
  }

  // Get status icon
  const getStatusIcon = (status: StepStatus) => {
    const iconClass = "h-2.5 w-2.5"

    switch (status) {
      case "completed":
        return <CheckCircle className={cn(iconClass, "text-green-500")} />
      case "failed":
        return <XCircle className={cn(iconClass, "text-red-500")} />
      case "cancelled":
        return <XCircle className={cn(iconClass, "text-gray-500")} />
      case "running":
        return <Loader2 className={cn(iconClass, "text-blue-500 animate-spin")} />
      case "pending":
        return <Circle className={cn(iconClass, "text-gray-400")} />
    }
  }

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [])

  // Format model name for display
  const formatModelName = (model: string): string => {
    const parts = model.split("/")
    const modelName = parts[parts.length - 1] || model

    // Shorten common model names
    if (modelName.startsWith("gpt-")) return modelName.toUpperCase()
    if (modelName.includes("claude")) return "Claude"
    if (modelName.includes("gemini")) return "Gemini"
    if (modelName.includes("llama")) return "Llama"

    return modelName
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with progress - more compact */}
      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{workflow.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {completedSteps}/{execution.totalSteps} • {getOverallDuration()}
            </span>
            {/* Stop button */}
            {(execution.status === "running" || execution.status === "preparing") && onStop && (
              <Button variant="ghost" size="sm" onClick={onStop} className="h-6 px-2">
                <Square className="h-2.5 w-2.5 mr-1" />
                <span className="text-[10px]">Stop</span>
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar - thinner */}
        <div className="w-full bg-gray-200 dark:bg-gray-800 h-1 overflow-hidden mt-2">
          <div
            className="bg-blue-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps list - more compact */}
      <div ref={viewportRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {workflowSteps.map((agentId, stepIndex) => {
          const agent = getAgent(agentId)
          if (!agent) return null

          const status = getStepStatus(stepIndex)
          const duration = getStepDuration(stepIndex)
          const isExpanded = expandedSteps.has(stepIndex)
          const isCurrentStep = execution.currentStep === stepIndex
          const stepExecution = execution.stepExecutions?.find((se) => se.stepIndex === stepIndex)

          return (
            <div
              key={`${stepIndex}-${agentId}`}
              className={cn(
                "border transition-all duration-200",
                status === "completed" && "border-green-200 dark:border-green-800",
                status === "failed" && "border-red-200 dark:border-red-800",
                status === "cancelled" && "border-gray-300 dark:border-gray-700",
                status === "running" && "border-blue-400 dark:border-blue-600 shadow-sm",
                status === "pending" && "border-gray-200 dark:border-gray-800",
              )}
            >
              {/* Step header - more compact */}
              <button
                onClick={() => toggleStepExpansion(stepIndex)}
                className={cn(
                  "w-full px-2 py-1.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors",
                  "text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
                  isExpanded && "border-b",
                )}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="text-xs font-medium">{agent.name}</span>
                  {/* Inline metadata badges - smaller */}
                  {stepExecution?.metadata?.model && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {formatModelName(stepExecution.metadata.model)}
                    </span>
                  )}
                  {stepExecution?.metadata?.toolCalls && stepExecution.metadata.toolCalls.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      {stepExecution.metadata.toolCalls.length} tool
                      {stepExecution.metadata.toolCalls.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {status === "running" && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      Running
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {duration && <span className="text-[10px] text-muted-foreground">{duration}</span>}
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-gray-400 transition-transform duration-200",
                      isExpanded && "rotate-180",
                    )}
                  />
                </div>
              </button>

              {/* Output preview when collapsed - more compact */}
              {!isExpanded && stepExecution?.output && status === "completed" && (
                <div className="px-2 pb-1 text-[10px] text-gray-600 dark:text-gray-400 truncate">
                  {stepExecution.output.split("\n")[0]?.substring(0, 80) || ""}
                  {stepExecution.output.length > 80 && "..."}
                </div>
              )}

              {/* Expanded content - more compact */}
              {isExpanded && (
                <div className="px-2 py-2 space-y-2">
                  {/* Agent instructions - smaller */}
                  <div className="text-xs">
                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-0.5">Instructions:</div>
                    <div className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2">
                      {agent.systemPrompt}
                    </div>
                  </div>

                  {/* Metadata section - more compact grid */}
                  {stepExecution?.metadata && (
                    <div className="text-xs">
                      <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Metadata:</div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {stepExecution.metadata.model && (
                          <div className="space-y-0.5">
                            <div className="text-gray-500 dark:text-gray-500">Model</div>
                            <div className="font-medium">{stepExecution.metadata.model}</div>
                          </div>
                        )}
                        {stepExecution.metadata.usage && (
                          <>
                            <div className="space-y-0.5">
                              <div className="text-gray-500 dark:text-gray-500">Total Tokens</div>
                              <div className="font-medium">{stepExecution.metadata.usage.totalTokens}</div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-gray-500 dark:text-gray-500">Prompt</div>
                              <div className="font-medium">{stepExecution.metadata.usage.promptTokens}</div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-gray-500 dark:text-gray-500">Completion</div>
                              <div className="font-medium">{stepExecution.metadata.usage.completionTokens}</div>
                            </div>
                          </>
                        )}
                        {stepExecution.metadata.toolCalls && stepExecution.metadata.toolCalls.length > 0 && (
                          <div className="col-span-2 space-y-0.5">
                            <div className="text-gray-500 dark:text-gray-500">
                              Tools ({stepExecution.metadata.toolCalls.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {stepExecution.metadata.toolCalls.map((toolCall, idx) => (
                                <span
                                  key={idx}
                                  className="font-medium text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5"
                                >
                                  {toolCall.toolName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step output - more compact */}
                  {status === "running" ? (
                    stepExecution?.output ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">Output:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(stepExecution.output || "")}
                            className="h-6 px-2"
                          >
                            <Copy className="h-2.5 w-2.5 mr-1" />
                            <span className="text-[10px]">Copy</span>
                          </Button>
                        </div>
                        <div className="bg-white dark:bg-gray-950 border p-2 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto max-h-64">
                          {stepExecution.output}
                          <span className="inline-block w-1.5 h-3 bg-blue-500 animate-pulse ml-0.5" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4 text-blue-600 dark:text-blue-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        <span className="text-xs">Executing step...</span>
                      </div>
                    )
                  ) : status === "pending" ? (
                    <div className="flex items-center justify-center py-4 text-gray-400">
                      <Circle className="h-3.5 w-3.5 mr-1.5" />
                      <span className="text-xs">Waiting to execute</span>
                    </div>
                  ) : status === "completed" ? (
                    stepExecution?.output ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">Output:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(stepExecution.output || "")}
                            className="h-6 px-2"
                          >
                            <Copy className="h-2.5 w-2.5 mr-1" />
                            <span className="text-[10px]">Copy</span>
                          </Button>
                        </div>
                        <div className="bg-white dark:bg-gray-950 border p-2 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto max-h-64">
                          {stepExecution.output}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600 dark:text-gray-400 py-2">
                        <p className="text-center">Step completed successfully</p>
                      </div>
                    )
                  ) : status === "failed" ? (
                    <div className="space-y-2">
                      {stepExecution?.output && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">Output:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(stepExecution.output || "")}
                              className="h-6 px-2"
                            >
                              <Copy className="h-2.5 w-2.5 mr-1" />
                              <span className="text-[10px]">Copy</span>
                            </Button>
                          </div>
                          <div className="bg-white dark:bg-gray-950 border p-2 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto max-h-64">
                            {stepExecution.output}
                          </div>
                        </div>
                      )}
                      {stepExecution?.error && (
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-2">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-red-800 dark:text-red-200 text-xs">Error</div>
                              <div className="text-red-700 dark:text-red-300 text-[10px] mt-0.5">
                                {stepExecution.error}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : status === "cancelled" ? (
                    <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <XCircle className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Step was cancelled</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}

        {workflowSteps.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-xs">No steps in this workflow</p>
          </div>
        )}
      </div>
    </div>
  )
})
