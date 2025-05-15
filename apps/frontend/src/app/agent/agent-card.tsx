"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Trash2Icon, PlayIcon, StopCircleIcon, AlertCircleIcon } from "lucide-react"
import { AgentConfig } from "@/lib/types"
import { AgentDialog } from "@/app/agent/agent-dialog"
import { useAgentProvider } from "@/hooks/use-agent"

interface AgentCardProps {
  agent: AgentConfig
  onEdit?: (agent: AgentConfig) => void
  onDelete?: (agentId: string) => void
}

export function AgentCard({ agent, onDelete }: AgentCardProps) {
  const { runAgent, errorMessage, stopAgent, isStopping, isAgentRunning, isAgentStreaming } = useAgentProvider()

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleRunAgentClick = async () => {
    try {
      await runAgent(agent)
    } catch (error) {
      console.error("Agent run initiation failed (locally in card):", error)
    }
  }

  const handleStopAgentClick = async () => {
    try {
      await stopAgent()
    } catch (error) {
      console.error("Failed to stop agent connections:", error)
    }
  }

  return (
    <Card
      className={cn("relative h-[10rem] max-h-[10rem] w-full max-w-xs border", {
        "border-destructive": !!errorMessage,
      })}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-primary/90 font-medium">{agent.name}</CardTitle>
          <div
            className={cn(
              "ml-2 h-2 w-2 rounded-full",
              isAgentRunning || isStopping ? "animate-pulse bg-green-500" : errorMessage ? "bg-red-500" : "bg-blue-500",
            )}
          ></div>
        </div>
        <CardDescription className="line-clamp-2 w-[90%]">{agent.systemPrompt.substring(0, 100)}...</CardDescription>
      </CardHeader>

      {errorMessage && (
        <div className="text-destructive flex items-center gap-1 px-6 pb-2 text-xs">
          <AlertCircleIcon className="h-3 w-3" />
          {errorMessage}
        </div>
      )}

      <CardFooter className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isAgentRunning && !isStopping && (
            <Button
              variant="secondary"
              className="bg-secondary/80 hover:bg-secondary/90 border hover:cursor-pointer"
              onClick={handleRunAgentClick}
              disabled={isAgentRunning || isStopping}
            >
              {isAgentRunning && !isAgentStreaming && !isStopping ? "Starting..." : "Run"}
              <PlayIcon className="ml-2 h-4 w-4" />
            </Button>
          )}

          {isAgentRunning && (
            <Button
              variant="destructive"
              className="border hover:cursor-pointer"
              onClick={handleStopAgentClick}
              disabled={isStopping}
            >
              {isStopping ? "Stopping..." : "Stop"}
              <StopCircleIcon className="ml-2 h-4 w-4" />
            </Button>
          )}

          <AgentDialog agent={agent} open={isDialogOpen} onOpenChange={setIsDialogOpen} />

          {onDelete && (
            <Button
              size="icon"
              variant="secondary"
              onClick={() => onDelete(agent.id)}
              className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
