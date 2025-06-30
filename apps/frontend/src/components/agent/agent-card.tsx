"use client"

import { MCPServersPopover } from "@/components/agent/mcp-servers-popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import { Settings } from "lucide-react"
import { useCallback, useMemo } from "react"

interface AgentCardProps {
  agent: Agent
  isAuthenticated?: boolean
  onEditClick?: (agent: Agent) => void
}

export function AgentCard({ agent, isAuthenticated = false, onEditClick }: AgentCardProps) {
  const { runAgent, getAgentExecution } = useAgent()
  const { models } = useAIModels()

  // Get execution data directly from Convex
  const execution = getAgentExecution(agent._id)

  // Get model name
  const modelName = useMemo(() => {
    const model = models.find((m) => m._id === agent.aiModelId)
    return model?.name || "Unknown Model"
  }, [models, agent.aiModelId])

  // Derive state from execution
  const status =
    execution?.status === "completed" ? "idle" : execution?.status === "failed" ? "error" : execution?.status || "idle"
  const error = execution?.error || null
  const isRunning = status === "preparing" || status === "running"

  const handleRun = useCallback(() => {
    runAgent(agent)
  }, [runAgent, agent])

  return (
    <Card
      className={cn(
        "relative h-[10rem] max-h-[10rem] w-full max-w-[16rem] border flex flex-col overflow-hidden transition-all duration-200",
        isRunning && "border-primary/80 bg-muted/50 border-2",
        status === "error" && "border-destructive/80 bg-destructive/5 border-2",
      )}
    >
      <div className="absolute top-2 right-2 z-10 bg-secondary/80 border px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {agent.outputType}
      </div>
      <CardHeader className=" flex-1 min-h-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-primary/90 font-medium">{agent.name}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {modelName}
          </Badge>
          {status === "preparing" && <div className="ml-2 h-2 w-2 rounded-full bg-yellow-500" />}
          {status === "running" && <div className="ml-2 h-2 w-2 rounded-full bg-green-500" />}
          {status === "error" && <div className="ml-2 h-2 w-2 rounded-full bg-red-500" />}
        </div>
        <CardDescription className="w-[90%] line-clamp-2 overflow-hidden">{agent.systemPrompt}</CardDescription>
        {/* {progress && <p className="text-xs text-muted-foreground mt-1">{progress}</p>} */}
        {error && status === "error" && <p className="text-xs text-destructive mt-1 line-clamp-1">{error}</p>}
      </CardHeader>
      <CardFooter className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isRunning ? "default" : "secondary"}
            onClick={handleRun}
            disabled={(!isAuthenticated && !agent.isPublic) || isRunning}
            className={cn(
              "border hover:cursor-pointer",
              isRunning ? "bg-primary hover:bg-primary" : "bg-secondary/80 hover:bg-secondary/90",
            )}
            title={
              isRunning
                ? "Agent is running"
                : !isAuthenticated && !agent.isPublic
                  ? "Login required to run private agents"
                  : "Run agent"
            }
          >
            {status === "preparing" ? "Preparing..." : status === "running" ? "Running..." : "Run"}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => onEditClick?.(agent)}
            className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
            disabled={!isAuthenticated || agent.isPublic}
            title={
              !isAuthenticated
                ? "Login required to edit agents"
                : agent.isPublic
                  ? "Public agents cannot be edited"
                  : "Edit agent"
            }
          >
            <Settings className="h-4 w-4" />
          </Button>

          {agent.outputType === "text" && agent.mcpServers && agent.mcpServers.length > 0 && (
            <MCPServersPopover serverIds={agent.mcpServers} />
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
