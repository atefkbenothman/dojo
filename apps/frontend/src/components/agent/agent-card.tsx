"use client"

import { AgentDialog } from "@/components/agent/agent-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAgentProvider } from "@/hooks/use-agent"
import { cn } from "@/lib/utils"
import type { AgentConfig } from "@dojo/config"
import { PlayIcon, StopCircleIcon } from "lucide-react"
import { useState } from "react"

interface AgentCardProps {
  agent: AgentConfig
  onEdit?: (agent: AgentConfig) => void
  onDelete?: (agentId: string) => void
}

export function AgentCard({ agent }: AgentCardProps) {
  const { runAgent, stopAgent, isStopping, isAgentRunning, isAgentStreaming } = useAgentProvider()

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
      className={cn(
        "relative h-[10rem] max-h-[10rem] w-full max-w-xs border",
        isAgentRunning && "border-primary/80 bg-muted/50",
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-primary/90 font-medium">{agent.name}</CardTitle>
          {isAgentRunning && <div className="ml-2 h-2 w-2 rounded-full bg-green-500"></div>}
        </div>
        <CardDescription className="w-[90%] truncate">{agent.systemPrompt}</CardDescription>
      </CardHeader>

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
              variant="default"
              className="bg-primary hover:bg-primary border hover:cursor-pointer"
              onClick={handleStopAgentClick}
              disabled={isStopping}
            >
              {isStopping ? "Stopping..." : "Stop"}
              <StopCircleIcon className="ml-2 h-4 w-4" />
            </Button>
          )}

          <AgentDialog agent={agent} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
        </div>
      </CardFooter>
    </Card>
  )
}
