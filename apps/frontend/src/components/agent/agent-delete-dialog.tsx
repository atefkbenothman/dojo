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
import type { Agent } from "@dojo/db/convex/types"
import { TriangleAlert } from "lucide-react"
import { memo } from "react"

interface AgentDeleteDialogProps {
  agent: Agent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (force?: boolean) => void
  affectedWorkflows?: Array<{ id: string; name: string; nodeCount: number; isPublic?: boolean }>
}

export const AgentDeleteDialog = memo(function AgentDeleteDialog({
  agent,
  open,
  onOpenChange,
  onConfirm,
  affectedWorkflows,
}: AgentDeleteDialogProps) {
  const hasAffectedWorkflows = affectedWorkflows && affectedWorkflows.length > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-destructive" />
            {hasAffectedWorkflows ? "Agent is used in workflows" : "Are you absolutely sure?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {hasAffectedWorkflows ? (
                <>
                  <div>
                    The agent &ldquo;{agent?.name}&rdquo; is currently being used in {affectedWorkflows.length} workflow
                    {affectedWorkflows.length > 1 ? "s" : ""}:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {affectedWorkflows.map((workflow) => (
                      <li key={workflow.id} className="text-sm">
                        {workflow.name} ({workflow.nodeCount} node{workflow.nodeCount > 1 ? "s" : ""})
                      </li>
                    ))}
                  </ul>
                  <div className="font-medium">
                    Force deleting will remove all workflow nodes that use this agent. This action cannot be undone.
                  </div>
                </>
              ) : (
                <div>
                  This action cannot be undone. This will permanently delete the agent &ldquo;{agent?.name}&rdquo; and
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
              onConfirm(hasAffectedWorkflows)
            }}
            className="hover:cursor-pointer bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
          >
            {hasAffectedWorkflows ? "Force delete agent" : "Yes, delete agent"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})
