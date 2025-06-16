"use client"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkflowDialog } from "@/components/workflow/workflow-dialog"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { PlusIcon } from "lucide-react"
import { useState } from "react"

export interface AddWorkflowCardProps {
  isAuthenticated?: boolean
}

export function AddWorkflowCard({ isAuthenticated = false }: AddWorkflowCardProps) {
  const { play } = useSoundEffectContext()

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Card
        className={`relative h-[10rem] max-h-[10rem] w-full max-w-[16rem] border border-dashed border-2 transition-colors ${
          !isAuthenticated
            ? "opacity-50 cursor-not-allowed pointer-events-none"
            : "hover:border-primary/80 hover:bg-muted/50 cursor-pointer"
        }`}
        onMouseDown={() => {
          if (isAuthenticated) play("./sounds/click.mp3", { volume: 0.5 })
        }}
        onClick={() => setIsDialogOpen(true)}
        tabIndex={!isAuthenticated ? -1 : 0}
        aria-disabled={!isAuthenticated}
      >
        <CardHeader className="flex h-full items-center justify-center">
          <CardTitle className="text-primary/90 flex items-center font-medium">
            <PlusIcon className="mr-2 h-5 w-5" />
            {!isAuthenticated ? "Sign in to add a workflow" : "Add New Workflow"}
          </CardTitle>
        </CardHeader>
      </Card>
      <WorkflowDialog mode="add" open={isDialogOpen} onOpenChange={setIsDialogOpen} isAuthenticated={isAuthenticated} />
    </>
  )
}
