"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import {
  ChevronDown,
  Trash,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Plus,
} from "lucide-react"
import { useState, memo, useCallback } from "react"

interface WorkflowTreeNodeProps {
  node: {
    nodeId: string
    type: "step" | "parallel"
    label?: string
    agentId?: string
  }
  agent?: Agent
  level: number
  executionStatus?: "pending" | "connecting" | "running" | "completed" | "failed" | "cancelled"
  onRemove: () => void
  onChangeAgent?: (agent: Agent) => void
  onAddStepWithAgent?: (agent: Agent) => void
  agents?: Agent[]
  getModel?: (modelId: string) => { name: string } | undefined
}

export const WorkflowTreeNode = memo(function WorkflowTreeNode({
  node,
  agent,
  executionStatus = "pending",
  onRemove,
  onChangeAgent,
  onAddStepWithAgent,
  agents,
  getModel,
}: WorkflowTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const getExecutionStatusIcon = () => {
    switch (executionStatus) {
      case "connecting":
        return <Clock className="h-3 w-3 text-yellow-500" />
      case "running":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const getNodeTypeIcon = () => {
    switch (node.type) {
      case "step":
        return "⚙️"
      case "parallel":
        return "🔀"
      default:
        return "❓"
    }
  }

  const getStatusBorderClass = () => {
    switch (executionStatus) {
      case "connecting":
        return "border-yellow-200 dark:border-yellow-800"
      case "running":
        return "border-blue-200 dark:border-blue-800 shadow-sm"
      case "completed":
        return "border-green-200 dark:border-green-800"
      case "failed":
        return "border-red-200 dark:border-red-800"
      default:
        return "border-border"
    }
  }

  const modelName = agent && getModel ? getModel(agent.aiModelId)?.name : undefined

  return (
    <div className="relative w-[280px]">
      <Card className={cn("overflow-hidden transition-colors", getStatusBorderClass())}>
        <div className="p-3">
          {/* Header - always visible */}
          <div className="space-y-2">
            {/* Node info */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Primary: Node name/label with type icon and execution status */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{getNodeTypeIcon()}</span>
                  <h4 className="text-sm font-medium leading-none text-foreground">
                    {node.label || `${node.type === "parallel" ? "Parallel" : "Step"} ${node.nodeId}`}
                  </h4>
                  {executionStatus && getExecutionStatusIcon()}
                </div>

                {/* Secondary: Agent info for step nodes */}
                {node.type === "step" && (
                  <div className="mt-1">
                    {agent ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">Agent:</span>
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-muted-foreground">•</span>
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                            "bg-secondary/80 text-secondary-foreground",
                          )}
                        >
                          {agent.outputType === "object" ? "JSON" : "Text"}
                        </span>
                        {modelName && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground truncate text-xs">{modelName}</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No agent assigned
                      </div>
                    )}
                  </div>
                )}

                {/* Parallel node info */}
                {node.type === "parallel" && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Executes children in parallel
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              {/* Add step button - always shows agent selector */}
              {onAddStepWithAgent && agents ? (
                <AgentSelectorPopover
                  agents={agents}
                  onSelect={onAddStepWithAgent}
                  getModel={getModel}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1 px-2 text-muted-foreground hover:text-foreground border-muted-foreground/20 text-xs"
                      title="Add step with agent"
                    >
                      <Plus className="h-3 w-3" />
                      Add step
                    </Button>
                  }
                />
              ) : null}

              {/* Change agent button (only for step nodes) */}
              {node.type === "step" && agents && onChangeAgent && (
                <AgentSelectorPopover
                  agents={agents}
                  onSelect={onChangeAgent}
                  getModel={getModel}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1 px-2 text-muted-foreground hover:text-foreground border-muted-foreground/20 text-xs"
                      title="Change agent"
                    >
                      Change
                    </Button>
                  }
                />
              )}

              {/* Remove button */}
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive hover:border-destructive/50 border-muted-foreground/20"
                onClick={onRemove}
                title="Remove node"
              >
                <Trash className="h-3 w-3" />
              </Button>

              {/* Expand button (if has agent details to show) */}
              {agent && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground border-muted-foreground/20"
                  onClick={handleToggleExpand}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  <ChevronDown
                    className={cn("h-3 w-3 transition-transform duration-200", isExpanded && "rotate-180")}
                  />
                </Button>
              )}
            </div>
          </div>

          {/* Expanded view - show agent details */}
          {isExpanded && agent && (
            <div className="border-t mt-2 pt-2">
              <div className="space-y-1.5">
                {/* System Prompt */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    System Prompt
                  </label>
                  <div className="text-xs text-foreground/90 bg-muted/30 rounded p-2 max-h-20 overflow-y-auto">
                    {agent.systemPrompt || "No system prompt"}
                  </div>
                </div>

                {/* Output Type */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Output Type
                  </label>
                  <div className="text-xs text-foreground/90">
                    {agent.outputType === "object" ? "Structured JSON" : "Text"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
})