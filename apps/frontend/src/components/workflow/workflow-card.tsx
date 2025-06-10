"use client"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useWorkflow } from "@/hooks/use-workflow"
import { cn } from "@/lib/utils"
import { Workflow } from "@dojo/db/convex/types"
import { Settings } from "lucide-react"
import { useState, useCallback } from "react"

interface WorkflowCardProps {
  workflow: Workflow
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const { runWorkflow } = useWorkflow()

  const [, setIsConfigDialogOpen] = useState(false)

  const handleRun = useCallback(() => {
    runWorkflow(workflow)
  }, [workflow, runWorkflow])

  return (
    <>
      <Card
        className={cn("relative h-[10rem] max-h-[10rem] w-full max-w-[16rem] border flex flex-col overflow-hidden")}
      >
        <div className="absolute top-2 right-2 z-10 bg-secondary/80 border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {workflow.steps.length} steps
        </div>
        <CardHeader className=" flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-primary/90 font-medium">{workflow.name}</CardTitle>
          </div>
          <CardDescription className="w-[90%] line-clamp-2 overflow-hidden">{workflow.description}</CardDescription>
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

            {/* {agent.output.type === "text" && agent.output.mcpServers && agent.output.mcpServers.length > 0 && (
              <AgentMCPServersPopover servers={agent.output.mcpServers.map((s) => ({ id: s.id, name: s.name }))} />
            )} */}
          </div>
        </CardFooter>
      </Card>
      {/* <AgentDialog mode="edit" agent={agent} open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen} /> */}
    </>
  )
}
