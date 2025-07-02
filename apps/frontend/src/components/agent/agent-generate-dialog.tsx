"use client"

import { AgentGenerateForm } from "@/components/agent/agent-generate-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export interface AgentGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAuthenticated?: boolean
}

export function AgentGenerateDialog({ open, onOpenChange, isAuthenticated = false }: AgentGenerateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border border-2 sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle />
        </VisuallyHidden>
        <AgentGenerateForm variant="dialog" isAuthenticated={isAuthenticated} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
