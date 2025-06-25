"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Workflow } from "@dojo/db/convex/types"
import { useState, useEffect } from "react"

interface WorkflowMetadataDialogProps {
  workflow: Workflow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updates: { name: string; description: string; instructions: string }) => Promise<void>
}

export function WorkflowMetadataDialog({ workflow, open, onOpenChange, onSave }: WorkflowMetadataDialogProps) {
  const [name, setName] = useState(workflow.name)
  const [description, setDescription] = useState(workflow.description)
  const [instructions, setInstructions] = useState(workflow.instructions)
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when workflow changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(workflow.name)
      setDescription(workflow.description)
      setInstructions(workflow.instructions)
    }
  }, [workflow, open])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({ name, description, instructions })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save workflow:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges =
    name !== workflow.name || description !== workflow.description || instructions !== workflow.instructions

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2">
        <DialogHeader>
          <DialogTitle>Edit Workflow</DialogTitle>
          <DialogDescription>Update the workflow details and instructions.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workflow name"
              className="focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this workflow does"
              className="min-h-[80px] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Detailed instructions for the workflow execution"
              className="min-h-[120px] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
