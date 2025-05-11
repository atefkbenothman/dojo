"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Trash2Icon } from "lucide-react"
import { AgentConfig } from "@/lib/types"
import { AgentDialog } from "./agent-dialog"

interface AgentCardProps {
  agent: AgentConfig
  onEdit?: (agent: AgentConfig) => void
  onDelete?: (agentId: string) => void
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <Card className={cn("relative h-[10rem] max-h-[10rem] w-full max-w-xs border-dashed")}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-primary/90 font-medium">{agent.name}</CardTitle>
          <div className="ml-2 h-2 w-2 rounded-full bg-blue-500"></div>
        </div>
        <CardDescription className="line-clamp-2 w-[90%]">{agent.systemPrompt.substring(0, 100)}...</CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
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
