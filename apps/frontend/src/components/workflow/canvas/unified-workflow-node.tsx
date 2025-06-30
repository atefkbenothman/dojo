"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import { NodeExecutionStatus } from "@/hooks/use-stable-execution-status"
import { cn } from "@/lib/utils"
import { UnifiedNodeData as TransformNodeData } from "@/lib/workflow-reactflow-transform"
import { Agent } from "@dojo/db/convex/types"
import { ChevronDown, Trash, CheckCircle, XCircle, Clock, Loader2, Plus, FileText, Pencil } from "lucide-react"
import { useState, memo, useCallback } from "react"
import { Handle, Position, NodeProps } from "reactflow"

interface UnifiedNodeData {
  // Common props
  variant: "instructions" | "step"

  // Instructions variant props
  instructions?: string
  onEditClick?: () => void

  // Step variant props
  workflowNode?: TransformNodeData["workflowNode"]
  agent?: Agent
  executionStatus?: NodeExecutionStatus
  expanded?: boolean
  onToggleExpand?: () => void
  onRemove?: (nodeId: string) => void
  onChangeAgent?: (nodeId: string, agent: Agent) => void
  onAddStepWithAgent?: (parentNodeId: string, agent: Agent) => void
  agents?: Agent[]
  getModel?: (modelId: string) => { name: string } | undefined
}

interface UnifiedWorkflowNodeProps extends NodeProps<UnifiedNodeData> {}

// Instructions Card Component
interface InstructionsCardProps {
  instructions?: string
  onEditClick?: () => void
  selected: boolean
}

const InstructionsCard = memo(function InstructionsCard({
  instructions,
  onEditClick,
  selected,
}: InstructionsCardProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium leading-none text-foreground">Workflow Instructions</h4>
        </div>
        {onEditClick && selected && (
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground border-muted-foreground/20"
            onClick={(e) => {
              e.stopPropagation()
              onEditClick()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Edit workflow metadata"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Instructions textarea */}
      <Textarea
        value={instructions || "Edit your workflow instructions here"}
        readOnly
        className="h-[120px] max-h-[300px] resize-none text-xs bg-muted/30 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default overflow-y-auto"
        placeholder="No instructions provided"
      />
    </>
  )
})

export const UnifiedWorkflowNode = memo(function UnifiedWorkflowNode({ data, selected }: UnifiedWorkflowNodeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const isInstructions = data.variant === "instructions"
  const isExpanded = data.expanded || false

  // Step node specific handlers
  const handleToggleExpand = useCallback(() => {
    data.onToggleExpand?.()
  }, [data.onToggleExpand])

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
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBorderClass = () => {
    if (isInstructions) {
      return "border-2 border-dashed border-muted-foreground/25"
    }

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
        return "border-border"
    }
  }

  const modelName = data.agent && data.getModel ? data.getModel(data.agent.aiModelId)?.name : undefined

  return (
    <>
      {/* Input handle for step nodes */}
      {!isInstructions && (
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
      )}

      <Card
        className={cn(
          "w-[280px] overflow-hidden",
          getStatusBorderClass(),
          isInstructions && "bg-background/95 backdrop-blur p-0",
          !isInstructions && isHovered && "shadow-md ring-1 ring-primary/20 scale-[1.01]",
          !isInstructions && data.executionStatus === "running" && "animate-pulse shadow-blue-200 dark:shadow-blue-800",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Instructions badge for instructions node */}
        {isInstructions && (
          <div className="absolute left-0 -translate-x-full -ml-2.5 top-2 z-10 flex items-center justify-center h-6 w-6 border bg-background rounded-full">
            <FileText className="h-3 w-3 text-muted-foreground" />
          </div>
        )}

        <div className={cn(isInstructions ? "p-4" : "p-3")}>
          {/* Progress bar for running step nodes */}
          {!isInstructions && data.executionStatus === "running" && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
              <div className="h-full w-full bg-blue-500 animate-pulse" />
            </div>
          )}

          {/* Instructions variant content */}
          {isInstructions ? (
            <InstructionsCard instructions={data.instructions} onEditClick={data.onEditClick} selected={selected} />
          ) : (
            <>
              {/* Step variant content */}
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
                          <span className="text-muted-foreground">Agent:</span>
                          <span className="font-medium">{data.agent.name}</span>
                          <span className="text-muted-foreground">•</span>
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

                {/* Action buttons */}
                <div
                  className={cn("flex items-center justify-end gap-2 pt-2", (selected || data.agent) && "border-t")}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Show action buttons only when selected */}
                  {selected && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-200">
                      {/* Add step button */}
                      {data.onAddStepWithAgent && data.agents ? (
                        <AgentSelectorPopover
                          agents={data.agents}
                          onSelect={handleAddStep}
                          getModel={data.getModel}
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

                      {/* Change agent button */}
                      {data.agents && data.onChangeAgent && (
                        <AgentSelectorPopover
                          agents={data.agents}
                          onSelect={handleChangeAgent}
                          getModel={data.getModel}
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
                        onClick={handleRemove}
                        title="Remove node"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Expand button (always visible if has agent details to show) */}
                  {data.agent && (
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
              {isExpanded && data.agent && (
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

                    {/* Output Type */}
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Output Type
                      </label>
                      <div className="text-xs text-foreground/90">
                        {data.agent.outputType === "object" ? "Structured JSON" : "Text"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Output handle - all nodes have this */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background:
            !isInstructions && data.executionStatus === "completed"
              ? "hsl(var(--green-500))"
              : "hsl(var(--muted-foreground))",
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
