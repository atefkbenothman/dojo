"use client"

import { AgentStatusIndicator } from "@/components/agent/agent-status-indicator"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { type AgentExecution, AGENT_STATUS, useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useAuth } from "@/hooks/use-auth"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import type { Agent } from "@dojo/db/convex/types"
import { Settings, Play, Pencil, Trash, Copy, Square } from "lucide-react"
import { useState, useMemo, useCallback } from "react"

interface AgentListItemProps {
  agent: Agent
  onEditClick: (agent: Agent) => void
  onDeleteClick: (agent: Agent) => void
  onCloneClick: (agent: Agent) => void
  isSelected: boolean
  onRun: () => void
  onStop: () => void
  execution?: AgentExecution
}

export function AgentListItem({
  agent,
  onEditClick,
  onDeleteClick,
  onCloneClick,
  isSelected,
  onRun,
  onStop,
  execution,
}: AgentListItemProps) {
  const { play } = useSoundEffectContext()
  const { models } = useAIModels()
  const { canRun, isAgentRunning } = useAgent()
  const { isAuthenticated } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Get model name
  const modelName = useMemo(() => {
    const model = models.find((m) => m._id === agent.aiModelId)
    return model?.name || "Unknown Model"
  }, [models, agent.aiModelId])

  // Use centralized logic from hook
  const agentCanRun = canRun(agent)
  const isRunning = isAgentRunning(execution)
  const status = execution?.status
  const isLoading = status === AGENT_STATUS.PREPARING || status === AGENT_STATUS.CONNECTING
  const isConnecting = status === AGENT_STATUS.CONNECTING

  // Final run button state: disabled when canRun is false AND not currently running
  // (if running, button becomes a stop button and should remain enabled)
  const shouldDisableRunButton = !agentCanRun && !isRunning

  // Get ring color based on agent status
  const getRingColor = () => {
    if (!status || status === "completed" || status === "cancelled") {
      return ""
    }

    switch (status) {
      case "running":
        return "ring-green-500/80"
      case "preparing":
      case "connecting":
        return "ring-yellow-500/80"
      case "failed":
        return "ring-red-500/80"
      default:
        return ""
    }
  }

  const handleCardClick = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  // Determine if user can edit/delete this agent
  // Note: Backend filtering ensures users only see agents they can edit/delete
  const canEdit = !agent.isPublic
  const canDelete = !agent.isPublic
  const canClone = isAuthenticated

  const handleMenuAction = useCallback((e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    setDropdownOpen(false)
    action()
  }, [])

  const handleRunClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRun()
  }

  const handleStopClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onStop()
  }

  return (
    <Card
      className={cn(
        "w-full bg-background overflow-hidden p-2 hover:bg-background/50",
        // Show status ring when there's a status
        getRingColor() && `ring-1 ${getRingColor()}`,
        // Show primary ring when selected (original behavior)
        isSelected && "ring-1 ring-primary/80 bg-background/50",
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Header matching workflow card exactly */}
        <div className="p-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
          {/* Title with status */}
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <p className={cn("text-sm font-medium truncate text-primary/70", isSelected && "text-primary")}>
              {agent.name}
            </p>
            {isConnecting ? <LoadingAnimationInline /> : <AgentStatusIndicator status={status} />}
          </div>
          {/* Right Side */}
          <div className="flex items-center gap-2 flex-shrink-0 w-auto justify-start sm:justify-end">
            {/* Settings */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8 hover:cursor-pointer">
                  <Settings className="h-2.5 w-2.5 text-foreground/90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={canEdit ? (e) => handleMenuAction(e, () => onEditClick(agent)) : undefined}
                  className={cn("hover:cursor-pointer", !canEdit && "opacity-50 cursor-not-allowed")}
                  disabled={!canEdit}
                  title={!canEdit ? "Cannot edit public agents" : undefined}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={canClone ? (e) => handleMenuAction(e, () => onCloneClick(agent)) : undefined}
                  className={cn("hover:cursor-pointer", !canClone && "opacity-50 cursor-not-allowed")}
                  disabled={!canClone}
                  title={!canClone ? "Sign in to clone agents" : undefined}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Clone
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(
                    "text-destructive focus:text-destructive hover:cursor-pointer",
                    !canDelete && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={canDelete ? (e) => handleMenuAction(e, () => onDeleteClick(agent)) : undefined}
                  disabled={!canDelete}
                  title={!canDelete ? "Cannot delete public agents" : undefined}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Run/Stop button */}
            <Button
              variant="outline"
              size="icon"
              onClick={isRunning ? handleStopClick : handleRunClick}
              disabled={shouldDisableRunButton}
              className="size-8 hover:cursor-pointer"
              title={
                status === AGENT_STATUS.PREPARING
                  ? "Agent is preparing"
                  : status === AGENT_STATUS.CONNECTING
                    ? "Agent is connecting to MCP servers"
                    : isRunning
                      ? "Stop agent"
                      : "Run agent"
              }
            >
              {isLoading ? (
                <LoadingAnimationInline className="text-xs" />
              ) : isRunning ? (
                <Square className="h-2.5 w-2.5" />
              ) : (
                <Play className="h-2.5 w-2.5" />
              )}
            </Button>
          </div>
        </div>
        {/* Badge Row */}
        <div className="px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border bg-muted">
              {modelName}
            </span>
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border bg-muted">
              {agent.outputType.toUpperCase()}
            </span>
            {agent.mcpServers && agent.mcpServers.length > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border bg-muted">
                {agent.mcpServers.length} MCP
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
