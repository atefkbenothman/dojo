"use client"

import { AgentDialog } from "@/components/agent/agent-dialog"
import { AgentMCPServersPopover } from "@/components/agent/mcp-servers-popover"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAgent } from "@/hooks/use-agent"
import { cn } from "@/lib/utils"
import { Agent } from "@dojo/db/convex/types"
import { Settings } from "lucide-react"
import { useState, useCallback } from "react"

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const { runAgent } = useAgent()

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)

  const handleRun = useCallback(() => {
    runAgent(agent)
  }, [runAgent, agent])

  return (
    <>
      <Card
        className={cn("relative h-[10rem] max-h-[10rem] w-full max-w-[16rem] border flex flex-col overflow-hidden")}
      >
        <div className="absolute top-2 right-2 z-10 bg-secondary/80 border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {agent.outputType}
        </div>
        <CardHeader className=" flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-primary/90 font-medium">{agent.name}</CardTitle>
          </div>
          <CardDescription className="w-[90%] line-clamp-2 overflow-hidden">{agent.systemPrompt}</CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleRun}
              className="border hover:cursor-pointer bg-secondary/80 hover:bg-secondary/90"
            >
              Run
            </Button>

            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsConfigDialogOpen(true)}
              className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {agent.outputType === "text" && agent.mcpServers && agent.mcpServers.length > 0 && (
              <AgentMCPServersPopover serverIds={agent.mcpServers} />
            )}
          </div>
        </CardFooter>
      </Card>
      <AgentDialog mode="edit" agent={agent} open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen} />
    </>
  )
}
