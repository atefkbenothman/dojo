"use client"

import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import { NodeExecutionStatus } from "@/hooks/use-stable-execution-status"
import { cn } from "@/lib/utils"
import { UnifiedNodeData as TransformNodeData } from "@/lib/workflow-reactflow-transform"
import { Agent } from "@dojo/db/convex/types"
import { Handle, Position } from "@xyflow/react"
import { Trash, Plus, Pencil, Bot, Settings } from "lucide-react"
import { memo, useCallback, useState } from "react"

// Step Node Data
export interface StepNodeData {
  workflowNode?: TransformNodeData["workflowNode"]
  agent?: Agent
  executionStatus?: NodeExecutionStatus
  onRemove?: (nodeId: string) => void
  onChangeAgent?: (nodeId: string, agent: Agent) => void
  onEditAgent?: (agent: Agent) => void
  onAddStepWithAgent?: (parentNodeId: string, agent: Agent) => void
  agents?: Agent[]
  getModel?: (modelId: string) => { name: string } | undefined
  getMcpServer?: (serverId: string) => { name: string } | undefined
}

export interface StepNodeProps {
  data: StepNodeData
  selected?: boolean
  id: string
}

// Step Card Component
interface StepCardProps {
  workflowNode?: TransformNodeData["workflowNode"]
  agent?: Agent
  onRemove?: (nodeId: string) => void
  onChangeAgent?: (nodeId: string, agent: Agent) => void
  onEditAgent?: (agent: Agent) => void
  onAddStepWithAgent?: (parentNodeId: string, agent: Agent) => void
  agents?: Agent[]
  getModel?: (modelId: string) => { name: string } | undefined
  getMcpServer?: (serverId: string) => { name: string } | undefined
}

const StepCard = memo(function StepCard({
  workflowNode,
  agent,
  onRemove,
  onChangeAgent,
  onEditAgent,
  onAddStepWithAgent,
  agents,
  getModel,
  getMcpServer,
}: StepCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleAddStep = useCallback(
    (selectedAgent: Agent) => {
      if (workflowNode && onAddStepWithAgent) {
        onAddStepWithAgent(workflowNode.nodeId, selectedAgent)
      }
    },
    [workflowNode, onAddStepWithAgent],
  )

  const handleChangeAgent = useCallback(
    (selectedAgent: Agent) => {
      if (workflowNode && onChangeAgent) {
        onChangeAgent(workflowNode.nodeId, selectedAgent)
      }
      setDropdownOpen(false)
    },
    [workflowNode, onChangeAgent],
  )

  const handleRemove = useCallback(() => {
    if (workflowNode && onRemove) {
      onRemove(workflowNode.nodeId)
    }
    setDropdownOpen(false)
  }, [workflowNode, onRemove])

  const handleEditAgent = useCallback(() => {
    if (agent && onEditAgent) {
      onEditAgent(agent)
    }
    setDropdownOpen(false)
  }, [agent, onEditAgent])

  const modelName = agent && getModel ? getModel(agent.aiModelId)?.name : undefined

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar for running nodes */}
      {/* {executionStatus === "running" && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-100 dark:bg-blue-900/50 overflow-hidden z-10">
          <div className="h-full w-full bg-blue-500 animate-pulse" />
        </div>
      )} */}

      {/* Header - similar to instructions-node pattern */}
      <div className="p-4 border-b-[2px] bg-muted">
        {/* First line: title, status, and action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-foreground">
              {workflowNode?.label || `Step ${workflowNode?.nodeId}`}
            </h4>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2">
            {/* Swap agent button */}
            {agents && onChangeAgent && (
              <AgentSelectorPopover
                agents={agents}
                onSelect={handleChangeAgent}
                getModel={getModel}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground border border-border"
                    title="Swap agent"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Bot className="h-3 w-3" />
                  </Button>
                }
              />
            )}

            {/* Settings dropdown */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground border border-border"
                  title="Node settings"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {agent && onEditAgent && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditAgent()
                    }}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit agent
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove()
                  }}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <Trash className="h-3 w-3" />
                  Delete node
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Second line: agent info */}
        <div className="mt-2">
          {agent ? (
            <div className="flex items-center gap-2 text-xs overflow-x-auto scrollbar-none nodrag nopan nowheel no-scrollbar">
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium",
                  "bg-background/70 text-secondary-foreground flex-shrink-0",
                )}
              >
                {agent.outputType === "object" ? "JSON" : "Text"}
              </span>
              {modelName && (
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium",
                    "bg-background/70 text-secondary-foreground flex-shrink-0",
                  )}
                >
                  {modelName}
                </span>
              )}
              {/* MCP server names on same line */}
              {agent.mcpServers &&
                agent.mcpServers.length > 0 &&
                getMcpServer &&
                agent.mcpServers.map((serverId) => {
                  const server = getMcpServer(serverId)
                  return server ? (
                    <span
                      key={serverId}
                      className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex-shrink-0"
                    >
                      {server.name}
                    </span>
                  ) : null
                })}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No agent assigned</div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="h-full min-h-0 bg-background">
        <Textarea
          value={agent?.systemPrompt || "No system prompt provided"}
          readOnly
          className="w-full min-h-[170px] max-h-[170px] text-xs resize-none bg-muted/30 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-text overflow-y-auto nodrag nopan nowheel no-scrollbar"
          placeholder="No system prompt provided"
        />
      </div>

      {/* Footer - similar to instructions-node pattern */}
      {onAddStepWithAgent && agents && (
        <div className="p-2 border-t-[2px] bg-muted">
          <AgentSelectorPopover
            agents={agents}
            onSelect={handleAddStep}
            getModel={getModel}
            trigger={
              <Button
                variant="default"
                className="w-full hover:cursor-pointer bg-primary/90"
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
    </div>
  )
})

export const StepNode = memo(function StepNode({ data, selected = false }: StepNodeProps) {
  const getStatusBorderClass = () => {
    switch (data.executionStatus) {
      case "connecting":
        return "ring-yellow-400 ring-2 dark:ring-yellow-800"
      case "running":
        return "ring-blue-400 ring-2 dark:ring-blue-800"
      case "completed":
        return "ring-green-400 ring-2 dark:ring-green-800"
      case "failed":
        return "ring-red-400 ring-2 dark:ring-red-800"
      default:
        return "ring-primary/20 ring-2"
    }
  }

  const getBorderBeamProps = () => {
    switch (data.executionStatus) {
      case "connecting":
        return {
          duration: 3,
          size: 100,
          colorFrom: "#facc15", // yellow-400
          colorTo: "#eab308", // yellow-500
          borderWidth: 3,
        }
      case "running":
        return {
          duration: 2,
          size: 100,
          colorFrom: "#60a5fa", // blue-400
          colorTo: "#3b82f6", // blue-500
          borderWidth: 3,
        }
      default:
        return null
    }
  }

  const shouldShowBorderBeam = data.executionStatus === "running" || data.executionStatus === "connecting"
  const borderBeamProps = getBorderBeamProps()

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
          "w-[280px] h-[260px] overflow-hidden relative p-0",
          getStatusBorderClass(),
          "bg-background/95 backdrop-blur",
          data.executionStatus === "running" && "shadow-blue-200 dark:shadow-blue-800",
          selected && "ring-2 ring-primary/80",
        )}
      >
        <StepCard
          workflowNode={data.workflowNode}
          agent={data.agent}
          onRemove={data.onRemove}
          onChangeAgent={data.onChangeAgent}
          onEditAgent={data.onEditAgent}
          onAddStepWithAgent={data.onAddStepWithAgent}
          agents={data.agents}
          getModel={data.getModel}
          getMcpServer={data.getMcpServer}
        />
        {shouldShowBorderBeam && borderBeamProps && (
          <BorderBeam
            duration={borderBeamProps.duration}
            size={borderBeamProps.size}
            colorFrom={borderBeamProps.colorFrom}
            colorTo={borderBeamProps.colorTo}
            borderWidth={borderBeamProps.borderWidth}
          />
        )}
      </Card>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: data.executionStatus === "completed" ? "hsl(var(--green-400))" : "hsl(var(--muted-foreground))",
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
