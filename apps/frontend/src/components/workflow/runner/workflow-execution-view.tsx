"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Agent, WorkflowExecution, Workflow } from "@dojo/db/convex/types"
import { CheckCircle, XCircle, Circle, Loader2, Copy, AlertTriangle, AlertCircle } from "lucide-react"
import { memo, useCallback, useRef } from "react"

interface WorkflowExecutionViewProps {
  workflow: Workflow
  execution?: WorkflowExecution
  agents: Agent[]
  workflowNodes?: Array<{ nodeId: string; agentId?: string; type: string; label?: string }>
}

type NodeStatus = "pending" | "connecting" | "running" | "completed" | "failed" | "cancelled"

export const WorkflowExecutionView = memo(function WorkflowExecutionView({
  workflow,
  execution,
  agents,
  workflowNodes = [],
}: WorkflowExecutionViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null)

  // Get agent by ID
  const getAgent = (agentId: string) => agents.find((agent) => agent._id === agentId)

  // Get node status
  const getNodeStatus = (nodeId: string): NodeStatus => {
    if (!execution?.nodeExecutions) {
      if (!execution?.currentNodes || execution.currentNodes.length === 0) return "pending"
      if (execution.currentNodes.includes(nodeId)) {
        return execution.status === "running" ? "running" : "pending"
      }
      return "pending"
    }

    const nodeExecution = execution.nodeExecutions.find((ne) => ne.nodeId === nodeId)
    return (nodeExecution?.status || "pending") as NodeStatus
  }

  // Count failed nodes
  const failedNodes = workflowNodes.filter((n) => n.type === "step" && getNodeStatus(n.nodeId) === "failed").length

  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  // Get node duration
  const getNodeDuration = (nodeId: string): string | null => {
    if (!execution?.nodeExecutions) return null

    const nodeExecution = execution.nodeExecutions.find((ne) => ne.nodeId === nodeId)
    if (!nodeExecution?.startedAt) return null

    const endTime = nodeExecution.completedAt || Date.now()
    return formatDuration(endTime - nodeExecution.startedAt)
  }

  // Calculate overall progress
  const completedNodes = execution?.nodeExecutions?.filter((ne) => ne.status === "completed").length || 0
  const totalNodes = execution?.totalSteps || workflowNodes.filter((n) => n.type === "step").length
  const progressPercentage = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0

  // Get overall execution time
  const getOverallDuration = () => {
    if (!execution?.startedAt) return "0s"
    const endTime = execution.completedAt || Date.now()
    return formatDuration(endTime - execution.startedAt)
  }

  // Get status icon
  const getStatusIcon = (status: NodeStatus) => {
    const iconClass = "h-2.5 w-2.5"

    switch (status) {
      case "completed":
        return <CheckCircle className={cn(iconClass, "text-green-500")} />
      case "failed":
        return (
          <div className="relative inline-flex items-center">
            <XCircle className={cn(iconClass, "text-red-500")} />
            <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
          </div>
        )
      case "cancelled":
        return <XCircle className={cn(iconClass, "text-gray-500")} />
      case "running":
        return <Loader2 className={cn(iconClass, "text-blue-500 animate-spin")} />
      case "connecting":
        return <Loader2 className={cn(iconClass, "text-orange-500 animate-spin")} />
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
    <div className="flex-1 relative flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex flex-col">
          <div className="max-w-4xl w-full px-0 sm:px-4 py-0 sm:py-8 h-full sm:h-auto flex flex-col sm:mx-auto sm:my-auto">
            <div className="h-full sm:h-auto min-w-[320px]">
              <Card className="p-0 border-0 sm:border-[1.5px] gap-0 rounded-none sm:rounded-lg h-full sm:h-auto flex flex-col">
                <CardHeader className="p-4 gap-0 border-b-[1.5px] flex-shrink-0 sticky top-0 z-10 bg-card sm:static">
                  <div className="flex items-center justify-between">
                    <CardTitle>{workflow.name}</CardTitle>
                    <div className="flex items-center gap-3">
                      {failedNodes > 0 && (
                        <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {failedNodes} failed
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {completedNodes}/{totalNodes} • {getOverallDuration()}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-muted/20 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent
                  className="p-4 bg-background flex-1 sm:flex-initial overflow-y-auto sm:overflow-visible flex flex-col space-y-8"
                  ref={viewportRef}
                >
                  {/* Overall status section */}
                  {execution && execution.status !== "preparing" && execution.status !== "running" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        <h2 className="text-base sm:text-lg font-semibold">Workflow Status</h2>
                      </div>
                      <Card
                        className={cn(
                          "p-3 sm:p-4 rounded-none sm:rounded-lg border-0 sm:border",
                          execution.status === "completed" && "text-green-600 bg-green-50 dark:bg-green-950/30",
                          execution.status === "failed" && "text-red-600 bg-red-50 dark:bg-red-950/30",
                          execution.status === "cancelled" && "text-gray-600 bg-gray-50 dark:bg-gray-950/30",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {execution.status === "completed" && <CheckCircle className="h-4 w-4" />}
                          {execution.status === "failed" && <AlertTriangle className="h-4 w-4" />}
                          {execution.status === "cancelled" && <XCircle className="h-4 w-4" />}
                          <span className="text-sm font-medium">
                            {execution.status === "completed" && "Workflow completed successfully"}
                            {execution.status === "failed" && (execution.error || "Workflow failed")}
                            {execution.status === "cancelled" && "Workflow was cancelled"}
                          </span>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Nodes section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <h2 className="text-base sm:text-lg font-semibold">Execution Steps</h2>
                    </div>
                    {workflowNodes.filter((n) => n.type === "step").length > 0 ? (
                      <div className="space-y-3">
                        {workflowNodes
                          .filter((n) => n.type === "step")
                          .map((node) => {
                            const agent = node.agentId ? getAgent(node.agentId) : null
                            if (!agent) return null

                            const status = getNodeStatus(node.nodeId)
                            const duration = getNodeDuration(node.nodeId)
                            const nodeExecution = execution?.nodeExecutions?.find((ne) => ne.nodeId === node.nodeId)

                            return (
                              <Card
                                key={node.nodeId}
                                className={cn(
                                  "p-0 border-[1.5px] gap-0 overflow-hidden",
                                  status === "completed" && "border-green-500/30 bg-green-50/50 dark:bg-green-950/30",
                                  status === "failed" && "border-red-500/30 bg-red-50/50 dark:bg-red-950/30",
                                  status === "cancelled" && "border-gray-500/30 bg-gray-50/50 dark:bg-gray-950/30",
                                  status === "running" && "border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/30",
                                  status === "connecting" &&
                                    "border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/30",
                                  status === "pending" && "border-muted bg-muted/20",
                                )}
                              >
                                <Accordion type="single" collapsible className="w-full">
                                  <AccordionItem value="item-1" className="border-0">
                                    <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline">
                                      <div className="flex items-center justify-between w-full pr-2">
                                        <div className="flex items-center gap-2">
                                          {getStatusIcon(status)}
                                          <span className="text-sm font-medium">{agent.name}</span>
                                          {/* Inline metadata badges */}
                                          {nodeExecution?.metadata?.model && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                              {formatModelName(nodeExecution.metadata.model)}
                                            </span>
                                          )}
                                          {nodeExecution?.metadata?.toolCalls &&
                                            nodeExecution.metadata.toolCalls.length > 0 && (
                                              <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                                {nodeExecution.metadata.toolCalls.length} tool
                                                {nodeExecution.metadata.toolCalls.length > 1 ? "s" : ""}
                                              </span>
                                            )}
                                          {status === "running" && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                              Running
                                            </span>
                                          )}
                                          {status === "connecting" && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                              Connecting
                                            </span>
                                          )}
                                        </div>
                                        {duration && <span className="text-xs text-muted-foreground">{duration}</span>}
                                      </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="px-3 pb-3">
                                      {/* Agent instructions */}
                                      <div className="space-y-2">
                                        <p className="text-base font-medium text-muted-foreground">Instructions</p>
                                        <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg font-mono">
                                          {agent.systemPrompt}
                                        </div>
                                      </div>

                                      {/* Metadata section */}
                                      {nodeExecution?.metadata && (
                                        <div className="space-y-2 mt-4">
                                          <p className="text-base font-medium text-muted-foreground">Metadata</p>
                                          <Card className="p-3 bg-muted/20 border-0">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                              {nodeExecution.metadata.model && (
                                                <div className="space-y-1">
                                                  <div className="text-xs text-muted-foreground">Model</div>
                                                  <div className="text-sm font-medium">
                                                    {nodeExecution.metadata.model}
                                                  </div>
                                                </div>
                                              )}
                                              {nodeExecution.metadata.usage && (
                                                <>
                                                  <div className="space-y-1">
                                                    <div className="text-xs text-muted-foreground">Total Tokens</div>
                                                    <div className="text-sm font-medium">
                                                      {nodeExecution.metadata.usage.totalTokens}
                                                    </div>
                                                  </div>
                                                  <div className="space-y-1">
                                                    <div className="text-xs text-muted-foreground">Prompt</div>
                                                    <div className="text-sm font-medium">
                                                      {nodeExecution.metadata.usage.promptTokens}
                                                    </div>
                                                  </div>
                                                  <div className="space-y-1">
                                                    <div className="text-xs text-muted-foreground">Completion</div>
                                                    <div className="text-sm font-medium">
                                                      {nodeExecution.metadata.usage.completionTokens}
                                                    </div>
                                                  </div>
                                                </>
                                              )}
                                              {nodeExecution.metadata.toolCalls &&
                                                nodeExecution.metadata.toolCalls.length > 0 && (
                                                  <div className="col-span-2 space-y-1">
                                                    <div className="text-xs text-muted-foreground">
                                                      Tools ({nodeExecution.metadata.toolCalls.length})
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                      {nodeExecution.metadata.toolCalls.map((toolCall, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="font-medium text-xs bg-muted px-2 py-1 rounded"
                                                        >
                                                          {toolCall.toolName}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                            </div>
                                          </Card>
                                        </div>
                                      )}

                                      {/* Node output */}
                                      <div className="mt-4 space-y-2">
                                        {status === "running" ? (
                                          nodeExecution?.output ? (
                                            <div>
                                              <div className="flex items-center justify-between mb-2">
                                                <p className="text-base font-medium text-muted-foreground">Output</p>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => copyToClipboard(nodeExecution.output || "")}
                                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                                  title="Copy output"
                                                >
                                                  <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                </Button>
                                              </div>
                                              <div className="bg-muted/20 border rounded-lg p-3 font-mono text-sm whitespace-pre-wrap overflow-x-auto max-h-64">
                                                {nodeExecution.output}
                                                <span className="inline-block w-1.5 h-3 bg-blue-500 ml-0.5 animate-pulse" />
                                              </div>
                                            </div>
                                          ) : (
                                            <Card className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/30">
                                              <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm font-medium">Executing node...</span>
                                              </div>
                                            </Card>
                                          )
                                        ) : status === "pending" ? (
                                          <Card className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-950/30">
                                            <div className="flex items-center justify-center gap-2">
                                              <Circle className="h-4 w-4" />
                                              <span className="text-sm font-medium">Waiting to execute</span>
                                            </div>
                                          </Card>
                                        ) : status === "completed" ? (
                                          nodeExecution?.output ? (
                                            <div>
                                              <div className="flex items-center justify-between mb-2">
                                                <p className="text-base font-medium text-muted-foreground">Output</p>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => copyToClipboard(nodeExecution.output || "")}
                                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                                  title="Copy output"
                                                >
                                                  <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                </Button>
                                              </div>
                                              <div className="bg-muted/20 border rounded-lg p-3 font-mono text-sm whitespace-pre-wrap overflow-x-auto max-h-64">
                                                {nodeExecution.output}
                                              </div>
                                            </div>
                                          ) : (
                                            <Card className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/30">
                                              <div className="flex items-center justify-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                                  Node completed successfully
                                                </span>
                                              </div>
                                            </Card>
                                          )
                                        ) : status === "failed" ? (
                                          <div className="space-y-2">
                                            {nodeExecution?.output && (
                                              <div>
                                                <div className="flex items-center justify-between mb-2">
                                                  <p className="text-base font-medium text-muted-foreground">Output</p>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => copyToClipboard(nodeExecution.output || "")}
                                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                                    title="Copy output"
                                                  >
                                                    <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                  </Button>
                                                </div>
                                                <div className="bg-muted/20 border rounded-lg p-3 font-mono text-sm whitespace-pre-wrap overflow-x-auto max-h-64">
                                                  {nodeExecution.output}
                                                </div>
                                              </div>
                                            )}
                                            {nodeExecution?.error && (
                                              <div>
                                                <p className="text-base font-medium text-muted-foreground mb-2">
                                                  Error Details
                                                </p>
                                                <Card className="p-3 sm:p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                                                  <div className="flex items-start gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1">
                                                      <div className="text-red-700 dark:text-red-300 text-sm">
                                                        {/* Parse error for better display */}
                                                        {(() => {
                                                          const error = nodeExecution.error
                                                          const lines = error.split("\n")
                                                          const firstLine = lines[0] || "Unknown error"
                                                          const errorType = firstLine.includes(":")
                                                            ? firstLine.split(":")[0]
                                                            : "Execution Error"
                                                          const errorMessage = firstLine.includes(":")
                                                            ? firstLine.split(":").slice(1).join(":").trim()
                                                            : firstLine

                                                          return (
                                                            <div className="space-y-1">
                                                              <div>
                                                                <span className="font-medium">{errorType}:</span>{" "}
                                                                {errorMessage}
                                                              </div>
                                                              {lines.length > 1 && (
                                                                <details className="cursor-pointer">
                                                                  <summary className="text-red-600 dark:text-red-400 hover:underline">
                                                                    Show details ({lines.length - 1} more lines)
                                                                  </summary>
                                                                  <div className="mt-1 pl-3 border-l-2 border-red-300 dark:border-red-700">
                                                                    <pre className="whitespace-pre-wrap break-all">
                                                                      {lines.slice(1).join("\n")}
                                                                    </pre>
                                                                  </div>
                                                                </details>
                                                              )}
                                                            </div>
                                                          )
                                                        })()}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </Card>
                                              </div>
                                            )}
                                          </div>
                                        ) : status === "cancelled" ? (
                                          <Card className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800">
                                            <div className="flex items-center justify-center gap-2">
                                              <XCircle className="h-4 w-4 text-gray-500" />
                                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Node was cancelled
                                              </span>
                                            </div>
                                          </Card>
                                        ) : null}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </Card>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[300px]">
                        <p className="text-xs text-gray-500">No nodes in this workflow</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
