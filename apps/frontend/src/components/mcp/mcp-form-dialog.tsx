"use client"

import { MCPForm } from "@/components/mcp/form/mcp-form"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { MCPServer } from "@dojo/db/convex/types"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export interface MCPFormDialogProps {
  mode: "add" | "edit"
  server?: MCPServer
  open: boolean
  onOpenChange: (open: boolean) => void
  isAuthenticated?: boolean
  onServerCreated?: (serverId: string) => void
}

export function MCPFormDialog({
  mode,
  server,
  open,
  onOpenChange,
  isAuthenticated = false,
  onServerCreated,
}: MCPFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border border-2 sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle />
        </VisuallyHidden>
        <MCPForm
          server={server}
          mode={mode}
          variant="dialog"
          isAuthenticated={isAuthenticated}
          onClose={() => onOpenChange(false)}
          onServerCreated={onServerCreated}
        />
      </DialogContent>
    </Dialog>
  )
}
