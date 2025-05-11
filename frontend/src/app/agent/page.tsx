"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { AgentBuilder } from "./agent-builder"

export default function AgentPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <AgentBuilder open={dialogOpen} onOpenChange={setDialogOpen} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="hover:bg-accent/50 flex h-[250px] cursor-pointer flex-col items-center justify-center border-dashed p-6 text-center transition-colors"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-1 text-lg font-medium">Create New Agent</h3>
          <p className="text-muted-foreground text-sm">Configure and deploy a custom AI agent</p>
        </Card>
      </div>
    </div>
  )
}
