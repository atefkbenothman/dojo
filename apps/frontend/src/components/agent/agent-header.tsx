"use client"

import { AgentStatusIndicator } from "@/components/agent/agent-status-indicator"
import { Button } from "@/components/ui/button"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { type AgentExecution, AGENT_STATUS, useAgent } from "@/hooks/use-agent"
import { cn } from "@/lib/utils"
import type { Agent } from "@dojo/db/convex/types"
import { Play, Square } from "lucide-react"

interface AgentHeaderProps {
  agent: Agent
  execution: AgentExecution | null
  onRun: () => void
  onStop: () => void
}

export function AgentHeader({ agent, execution, onRun, onStop }: AgentHeaderProps) {
  const { canRun, isAgentRunning } = useAgent()

  // Use centralized logic from hook (IDENTICAL to AgentListItem)
  const agentCanRun = canRun(agent)
  const isRunning = isAgentRunning(execution || undefined)
  const status = execution?.status
  const isPreparing = status === AGENT_STATUS.PREPARING
  const isConnecting = status === AGENT_STATUS.CONNECTING

  // Final run button state: disabled when canRun is false AND not currently running
  // (if running, button becomes a stop button and should remain enabled)
  const shouldDisableRunButton = !agentCanRun && !isRunning

  return (
    <div className="p-4 border-b-[1.5px] flex-shrink-0 flex items-center justify-between bg-card h-[42px]">
      {/* Left section - Name and Edit */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{agent.name}</p>
        <AgentStatusIndicator status={status} />
      </div>

      {/* Right section - Run/Stop button */}
      <div className="flex items-center justify-end flex-shrink-0 ml-4">
        <Button
          className={cn(
            "border-[1px] hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
            isRunning
              ? "bg-red-700 hover:bg-red-800 text-white border-red-500 hover:border-red-800 disabled:hover:bg-red-700"
              : "bg-green-700 hover:bg-green-800 text-white border-green-500 hover:border-green-800 disabled:hover:bg-green-700",
          )}
          onClick={isRunning ? onStop : onRun}
          disabled={shouldDisableRunButton}
          title={
            isPreparing
              ? "Agent is preparing"
              : isConnecting
                ? "Agent is connecting to MCP servers"
                : isRunning
                  ? "Stop agent"
                  : "Run agent"
          }
        >
          {isPreparing ? (
            <>
              <LoadingAnimationInline className="mr-1" />
              Preparing
            </>
          ) : isConnecting ? (
            <>
              <LoadingAnimationInline className="mr-1" />
              Connecting
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
