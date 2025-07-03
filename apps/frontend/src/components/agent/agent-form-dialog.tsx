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
  isAuthenticated?: boolean
}

export function AgentFormDialog({ mode, agent, open, onOpenChange, isAuthenticated = false }: AgentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border border-2 sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle />
        </VisuallyHidden>
        <AgentForm
          agent={agent}
          mode={mode}
          variant="dialog"
          isAuthenticated={isAuthenticated}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
