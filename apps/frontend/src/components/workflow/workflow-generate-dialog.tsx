"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { WorkflowGenerateForm } from "@/components/workflow/workflow-generate-form"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export interface WorkflowGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAuthenticated?: boolean
}

export function WorkflowGenerateDialog({ open, onOpenChange, isAuthenticated = false }: WorkflowGenerateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border border-2 sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle />
        </VisuallyHidden>
        <WorkflowGenerateForm variant="dialog" isAuthenticated={isAuthenticated} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
