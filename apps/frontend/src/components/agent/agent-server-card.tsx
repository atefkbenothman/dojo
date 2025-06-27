"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAIModels } from "@/hooks/use-ai-models"
import { cn } from "@/lib/utils"
import type { Agent } from "@dojo/db/convex/types"
import { Settings, Play, Pencil, Trash, Cpu, Copy } from "lucide-react"
import { useState, useMemo } from "react"

interface AgentExecution {
  agentId: string
  status: "preparing" | "running" | "completed" | "failed"
  error?: string
}

interface AgentServerCardProps {
  agent: Agent
  isAuthenticated: boolean
  onEditClick: (agent: Agent) => void
  onDeleteClick: (agent: Agent) => void
  onCloneClick: (agent: Agent) => void
  isSelected: boolean
  onRun: () => void
  execution?: AgentExecution
}

export function AgentServerCard({
  agent,
  isAuthenticated,
  onEditClick,
  onDeleteClick,
  onCloneClick,
  isSelected,
  onRun,
  execution,
}: AgentServerCardProps) {
  const { models } = useAIModels()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Get model name
  const modelName = useMemo(() => {
    const model = models.find((m) => m._id === agent.aiModelId)
    return model?.name || "Unknown Model"
  }, [models, agent.aiModelId])

  // Derive state from execution
  const status = execution?.status || "idle"
  const isRunning = status === "preparing" || status === "running"
  const hasError = status === "failed"

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger selection when clicking buttons or dropdown
    if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) {
      e.stopPropagation()
    }
  }

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
            {isRunning && status === "running" && <div className="h-2 w-2 bg-green-500 shrink-0" />}
            {isRunning && status === "preparing" && <div className="h-2 w-2 bg-yellow-500 shrink-0" />}
            {hasError && <div className="h-2 w-2 bg-red-500 shrink-0" />}
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
                  Clone
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
            {/* Run button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRunClick}
              disabled={(!isAuthenticated && !agent.isPublic) || isRunning}
              className="size-8 hover:cursor-pointer"
              title={
                isRunning
                  ? "Agent is running"
                  : !isAuthenticated && !agent.isPublic
                    ? "Login required to run private agents"
                    : "Run agent"
              }
            >
              <Play className="h-2.5 w-2.5" />
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
