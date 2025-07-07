"use client"

import { AgentForm } from "@/components/agent/form/agent-form"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { Agent } from "@dojo/db/convex/types"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export interface AgentFormDialogProps {
  mode: "add" | "edit"
  agent?: Agent
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentCreated?: (agentId: string) => void
}

export function AgentFormDialog({ mode, agent, open, onOpenChange, onAgentCreated }: AgentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border border-2 sm:max-w-2xl h-[90vh] max-h-[90vh] p-0 flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle />
        </VisuallyHidden>
        <AgentForm
          agent={agent}
          mode={mode}
          variant="dialog"
          onClose={() => onOpenChange(false)}
          onAgentCreated={onAgentCreated}
        />
      </DialogContent>
    </Dialog>
  )
}
