"use client"

import { AgentStatusIndicator } from "@/components/agent/agent-status-indicator"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { type AgentExecution, isAgentRunning, isAgentError, AGENT_STATUS } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import type { Agent } from "@dojo/db/convex/types"
import { Settings, Play, Pencil, Trash, Copy, Square } from "lucide-react"
import { useState, useMemo, useCallback } from "react"

interface AgentListItemProps {
  agent: Agent
  isAuthenticated: boolean
  onEditClick: (agent: Agent) => void
  onDeleteClick: (agent: Agent) => void
  onCloneClick: (agent: Agent) => void
  isSelected: boolean
  isLoading?: boolean
  onRun: () => void
  onStop: () => void
  execution?: AgentExecution
}

export function AgentListItem({
  agent,
  isAuthenticated,
  onEditClick,
  onDeleteClick,
  onCloneClick,
  isSelected,
  isLoading,
  onRun,
  onStop,
  execution,
}: AgentListItemProps) {
  const { play } = useSoundEffectContext()
  const { models } = useAIModels()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Get model name
  const modelName = useMemo(() => {
    const model = models.find((m) => m._id === agent.aiModelId)
    return model?.name || "Unknown Model"
  }, [models, agent.aiModelId])

  // Derive state from execution
  const status = execution?.status
  const isRunning = isAgentRunning(status)
  const hasError = isAgentError(status)

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      play("./sounds/click.mp3", { volume: 0.5 })
    },
    [play],
  )

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDropdownOpen(false)
    onEditClick(agent)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDropdownOpen(false)
    onDeleteClick(agent)
  }

  // Determine if user can edit/delete this agent
  const canEdit = isAuthenticated && !agent.isPublic
  const canDelete = isAuthenticated && !agent.isPublic

  const handleCloneClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDropdownOpen(false)
    onCloneClick(agent)
  }

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
        // Only show ring when selected
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
            <AgentStatusIndicator status={status} />
          </div>
          {/* Right Side */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-start sm:justify-end">
            {/* Settings */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8 hover:cursor-pointer">
                  <Settings className="h-2.5 w-2.5 text-foreground/90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={handleEditClick} className="cursor-pointer" disabled={!canEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCloneClick} className="cursor-pointer" disabled={!isAuthenticated}>
                  <Copy className="mr-2 h-4 w-4" />
                  Create copy
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  disabled={!canDelete}
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
              disabled={(!isAuthenticated && !agent.isPublic) || isLoading}
              className="size-8 hover:cursor-pointer"
              title={
                isLoading
                  ? "Agent is preparing"
                  : isRunning
                    ? "Stop agent"
                    : !isAuthenticated && !agent.isPublic
                      ? "Login required to run private agents"
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
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border">
              {modelName}
            </span>
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border">
              {agent.outputType.toUpperCase()}
            </span>
            {agent.mcpServers && agent.mcpServers.length > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border">
                {agent.mcpServers.length} MCP
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
