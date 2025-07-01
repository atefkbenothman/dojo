"use client"

import { AgentStatusIndicator } from "@/components/agent/agent-status-indicator"
import { Button } from "@/components/ui/button"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { type AgentStatus, AGENT_STATUS, canRunAgent } from "@/hooks/use-agent"
import { cn } from "@/lib/utils"
import type { Agent } from "@dojo/db/convex/types"
import { Pencil, Play, Square } from "lucide-react"

interface AgentHeaderProps {
  agent: Agent
  execution: {
    status: AgentStatus
    error?: string
  } | null
  isAuthenticated: boolean
  onEdit: () => void
  onRun: () => void
  onStop: () => void
}

export function AgentHeader({ agent, execution, isAuthenticated, onEdit, onRun, onStop }: AgentHeaderProps) {
  const status = execution?.status
  const isRunning = status === AGENT_STATUS.RUNNING
  const isPreparing = status === AGENT_STATUS.PREPARING

  return (
    <div className="p-4 border-b-[1.5px] flex-shrink-0 flex items-center justify-between bg-card h-[42px]">
      {/* Left section - Name and Edit */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{agent.name}</p>
        <AgentStatusIndicator status={status} />
        {/* Edit - only show for non-public agents */}
        {/* {!agent.isPublic && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="hover:cursor-pointer"
            disabled={!isAuthenticated}
            title={!isAuthenticated ? "Login required to edit agents" : "Edit agent"}
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
        )} */}
      </div>

      {/* Right section - Run/Stop button */}
      <div className="flex items-center justify-end flex-shrink-0 ml-4">
        <Button
          className={cn(
            "border-[1px] hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
            isRunning
              ? "bg-red-700 hover:bg-red-800 text-white border-red-500 hover:border-red-800"
              : "bg-green-700 hover:bg-green-800 text-white border-green-500 hover:border-green-800",
          )}
          onClick={isRunning ? onStop : onRun}
          disabled={(!isAuthenticated && !agent.isPublic) || isPreparing}
          title={
            isPreparing
              ? "Agent is preparing"
              : isRunning
                ? "Stop agent"
                : !isAuthenticated && !agent.isPublic
                  ? "Login required to run private agents"
                  : "Run agent"
          }
        >
          {isPreparing ? (
            <>
              <LoadingAnimationInline className="mr-1" />
              Preparing
            </>
          ) : isRunning ? (
            <>
              <Square className="h-3 w-3 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-3 w-3 mr-1" />
              Run
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
