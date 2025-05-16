"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AgentConfig } from "@/lib/types"
import { Settings } from "lucide-react"

interface AgentDialogProps {
  agent: AgentConfig
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentDialog({ agent, open, onOpenChange }: AgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{agent.name} Settings</DialogTitle>
          <DialogDescription>View agent configuration details</DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[calc(90vh-200px)] overflow-y-auto rounded-md border p-4">
          <div className="space-y-6">
            <div>
              <Label className="text-xs font-medium">Agent ID</Label>
              <div className="bg-muted mt-1 rounded-md p-2 text-sm">{agent.id}</div>
            </div>

            <div>
              <Label className="text-xs font-medium">Model</Label>
              <div className="bg-muted mt-1 rounded-md p-2 text-sm">{agent.modelId}</div>
            </div>

            <div>
              <Label className="text-xs font-medium">Maximum Execution Steps</Label>
              <div className="bg-muted mt-1 rounded-md p-2 text-sm">{agent.maxExecutionSteps}</div>
            </div>

            <div>
              <Label className="text-xs font-medium">System Prompt</Label>
              <div className="bg-muted mt-1 rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
                {agent.systemPrompt}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Connected Servers ({agent.mcpServers.length})</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {agent.mcpServers.map((server) => (
                  <div key={server.id} className="bg-secondary/40 text-foreground rounded-md px-3 py-1.5 text-sm">
                    {server.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
