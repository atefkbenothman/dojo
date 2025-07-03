"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { MCPServer } from "@dojo/db/convex/types"
import { TriangleAlert } from "lucide-react"
import { memo } from "react"

interface MCPDeleteDialogProps {
  server: MCPServer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (force?: boolean) => void
  affectedAgents?: Array<{ id: string; name: string; isPublic?: boolean }>
}

export const MCPDeleteDialog = memo(function MCPDeleteDialog({
  server,
  open,
  onOpenChange,
  onConfirm,
  affectedAgents,
}: MCPDeleteDialogProps) {
  const hasAffectedAgents = affectedAgents && affectedAgents.length > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-destructive" />
            {hasAffectedAgents ? "MCP Server is in use" : "Are you absolutely sure?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {hasAffectedAgents ? (
                <>
                  <div>
                    The MCP server &ldquo;{server?.name}&rdquo; is currently being used by {affectedAgents.length} agent{affectedAgents.length > 1 ? "s" : ""}:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {affectedAgents.map((agent) => (
                      <li key={agent.id} className="text-sm">
                        {agent.name}
                      </li>
                    ))}
                  </ul>
                  <div className="font-medium">
                    Force deleting will remove this MCP server from all affected agents. This action cannot be undone.
                  </div>
                </>
              ) : (
                <div>
                  This action cannot be undone. This will permanently delete the MCP server &ldquo;{server?.name}&rdquo; and
                  remove it from your account.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm(hasAffectedAgents)
            }}
            className="hover:cursor-pointer bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
          >
            {hasAffectedAgents ? "Force delete server" : "Yes, delete server"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})
