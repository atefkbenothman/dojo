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
import { Agent } from "@dojo/db/convex/types"
import { TriangleAlert } from "lucide-react"
import { memo } from "react"

interface NodeDeleteDialogProps {
  node: {
    nodeId: string
    type: "step"
    label?: string
  } | null
  agent?: Agent
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const NodeDeleteDialog = memo(function NodeDeleteDialog({
  node,
  agent,
  open,
  onOpenChange,
  onConfirm,
}: NodeDeleteDialogProps) {
  const getNodeDisplayName = () => {
    if (agent?.name) return agent.name
    if (node?.label) return node.label
    return `Step ${node?.nodeId}`
  }

  const getWarningMessage = () => {
    return "This will also permanently delete any child nodes and their configurations."
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-destructive" />
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the node &ldquo;{getNodeDisplayName()}&rdquo; and{" "}
            {getWarningMessage()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="hover:cursor-pointer bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
          >
            Yes, delete node
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})
