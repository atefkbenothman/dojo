"use client"

import { AgentDialog } from "@/components/agent/agent-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AgentConfig } from "@dojo/config"
import { Settings } from "lucide-react"
import { useState } from "react"

interface AgentCardProps {
  agent: AgentConfig
}

export function AgentCard({ agent }: AgentCardProps) {
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)

  const handleRun = () => {
    console.log("Run agent:", agent.name)
  }

  // const handleStop = () => {
  //   console.log("Stop agent:", agent.name)
  // }

  return (
    <>
      <Card className={cn("relative h-[10rem] max-h-[10rem] w-full max-w-xs border flex flex-col overflow-hidden")}>
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
          </div>
        </CardFooter>
      </Card>
      <AgentDialog mode="edit" agent={agent} open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen} />
    </>
  )
}
