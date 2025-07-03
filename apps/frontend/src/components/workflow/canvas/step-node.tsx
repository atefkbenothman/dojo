"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import { NodeExecutionStatus } from "@/hooks/use-stable-execution-status"
import { cn } from "@/lib/utils"
import { UnifiedNodeData as TransformNodeData } from "@/lib/workflow-reactflow-transform"
import { Agent } from "@dojo/db/convex/types"
import { Trash, CheckCircle, XCircle, Clock, Plus, SquarePen } from "lucide-react"
import { useState, memo, useCallback } from "react"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { Handle, Position, NodeProps } from "reactflow"

// Step Node Data - no more variant or instructions props
interface StepNodeData {
  workflowNode?: TransformNodeData["workflowNode"]
  agent?: Agent
  executionStatus?: NodeExecutionStatus
  onRemove?: (nodeId: string) => void
  onChangeAgent?: (nodeId: string, agent: Agent) => void
  onAddStepWithAgent?: (parentNodeId: string, agent: Agent) => void
  agents?: Agent[]
  getModel?: (modelId: string) => { name: string } | undefined
}

interface StepNodeProps extends NodeProps<StepNodeData> {}

export const StepNode = memo(function StepNode({ data, selected }: StepNodeProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Step node specific handlers

  const handleAddStep = useCallback(
    (agent: Agent) => {
      if (data.workflowNode && data.onAddStepWithAgent) {
        data.onAddStepWithAgent(data.workflowNode.nodeId, agent)
      }
    },
    [data],
  )

  const handleChangeAgent = useCallback(
    (agent: Agent) => {
      if (data.workflowNode && data.onChangeAgent) {
        data.onChangeAgent(data.workflowNode.nodeId, agent)
      }
    },
    [data],
  )

  const handleRemove = useCallback(() => {
    if (data.workflowNode && data.onRemove) {
      data.onRemove(data.workflowNode.nodeId)
    }
  }, [data])

  const getExecutionStatusIcon = () => {
    if (!data.executionStatus) return null

    switch (data.executionStatus) {
      case "connecting":
        return <Clock className="h-3 w-3 text-yellow-500" />
      case "running":
        return <LoadingAnimationInline className="h-3 w-3 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBorderClass = () => {
    switch (data.executionStatus) {
      case "connecting":
        return "border-yellow-200 dark:border-yellow-800"
      case "running":
        return "border-blue-200 dark:border-blue-800 shadow-sm"
      case "completed":
        return "border-green-200 dark:border-green-800"
      case "failed":
        return "border-red-200 dark:border-red-800"
      default:
        return "border"
    }
  }

  const modelName = data.agent && data.getModel ? data.getModel(data.agent.aiModelId)?.name : undefined

  return (
    <>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: data.executionStatus === "running" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          width: 10,
          height: 10,
          border: "2px solid hsl(var(--background))",
          boxShadow: "0 0 0 2px hsl(var(--border))",
          transition: "all 0.2s ease",
        }}
      />

      <Card
        className={cn(
          "w-[280px] overflow-hidden p-4 relative",
          getStatusBorderClass(),
          data.executionStatus === "running" && "animate-pulse shadow-blue-200 dark:shadow-blue-800",
          selected && "ring-2 ring-primary/80",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Action buttons in top right corner */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {/* Change agent button */}
          {data.agents && data.onChangeAgent && (
            <AgentSelectorPopover
              agents={data.agents}
              onSelect={handleChangeAgent}
              getModel={data.getModel}
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Change agent"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <SquarePen className="h-3 w-3" />
                </Button>
              }
            />
          )}

          {/* Remove button */}
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:border-destructive/50"
            onClick={handleRemove}
            onMouseDown={(e) => e.stopPropagation()}
            title="Remove node"
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>

        <div className="">
          {/* Progress bar for running nodes */}
          {data.executionStatus === "running" && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
              <div className="h-full w-full bg-blue-500 animate-pulse" />
            </div>
          )}

          {/* Step content */}
          <div className="space-y-2">
            {/* Node info */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Primary: Node name/label with type icon and execution status */}
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-medium leading-none text-foreground">
                    {data.workflowNode?.label || `Step ${data.workflowNode?.nodeId}`}
                  </h4>
                  {data.executionStatus && getExecutionStatusIcon()}
                </div>

                {/* Agent info */}
                <div className="mt-1">
                  {data.agent ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      {/* <span className="text-muted-foreground">Agent:</span>
                      <span className="font-medium">{data.agent.name}</span>
                      <span className="text-muted-foreground">•</span> */}
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                          "bg-secondary/80 text-secondary-foreground",
                        )}
                      >
                        {data.agent.outputType === "object" ? "JSON" : "Text"}
                      </span>
                      {modelName && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground truncate text-xs">{modelName}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No agent assigned (structural node)</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Agent details - always visible */}
          {data.agent && (
            <div className="border-t mt-2 pt-2">
              <div className="space-y-1.5">
                {/* System Prompt */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    System Prompt
                  </label>
                  <div className="text-xs text-foreground/90 bg-muted/30 rounded p-2 max-h-20 overflow-y-auto">
                    {data.agent.systemPrompt || "No system prompt"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add step button at the bottom */}
        {data.onAddStepWithAgent && data.agents && (
          <div className="h-8">
            <AgentSelectorPopover
              agents={data.agents}
              onSelect={handleAddStep}
              getModel={data.getModel}
              trigger={
                <Button
                  variant="outline"
                  className="w-full text-muted-foreground hover:text-foreground border-muted-foreground/20 text-xs font-medium hover:cursor-pointer"
                  title="Add step with agent"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add step
                </Button>
              }
            />
          </div>
        )}
      </Card>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: data.executionStatus === "completed" ? "hsl(var(--green-500))" : "hsl(var(--muted-foreground))",
          width: 10,
          height: 10,
          border: "2px solid hsl(var(--background))",
          boxShadow: "0 0 0 2px hsl(var(--border))",
          transition: "all 0.2s ease",
        }}
      />
    </>
  )
})

// Keep UnifiedWorkflowNode as an alias for backward compatibility
export const UnifiedWorkflowNode = StepNode
