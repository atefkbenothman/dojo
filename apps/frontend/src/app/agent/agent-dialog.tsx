"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import type { AgentConfig } from "@dojo/config"
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
      <DialogContent className="border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {agent.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-primary/80 text-xs" htmlFor="agent-id">
              Agent ID
            </Label>
            <div id="agent-id" className="text-sm">
              {agent.id}
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-primary/80 text-xs" htmlFor="agent-model">
              Model
            </Label>
            <div id="agent-model" className="text-sm">
              {agent.modelId}
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-primary/80 text-xs" htmlFor="agent-steps">
              Maximum Execution Steps
            </Label>
            <div id="agent-steps" className="text-sm">
              {agent.maxExecutionSteps}
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-primary/80 text-xs" htmlFor="agent-system-prompt">
              System Prompt
            </Label>
            <div id="agent-system-prompt" className="text-sm font-mono whitespace-pre-wrap">
              {agent.systemPrompt}
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-primary/80 text-xs">Connected Servers ({agent.mcpServers.length})</Label>
            <div className="flex flex-wrap gap-2">
              {agent.mcpServers.map((server) => (
                <div key={server.id} className="bg-secondary/40 text-foreground rounded-md px-3 py-1.5 text-sm">
                  {server.name}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" className="hover:cursor-pointer" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
