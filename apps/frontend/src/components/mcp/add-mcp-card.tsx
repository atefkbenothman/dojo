"use client"

import { MCPDialog } from "@/components/mcp/mcp-dialog"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { PlusIcon } from "lucide-react"
import { useState } from "react"

export interface AddMCPCardProps {
  disabled?: boolean
}

export function AddMCPCard({ disabled = false }: AddMCPCardProps) {
  const { play } = useSoundEffectContext()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Card
        className={`relative h-[10rem] max-h-[10rem] w-full max-w-[16rem] border border-dashed border-2 transition-colors ${
          disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none"
            : "hover:border-primary/80 hover:bg-muted/50 cursor-pointer"
        }`}
        onMouseDown={() => {
          if (!disabled) play("./sounds/click.mp3", { volume: 0.5 })
        }}
        onClick={() => {
          if (!disabled) setIsDialogOpen(true)
        }}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
      >
        <CardHeader className="flex h-full items-center justify-center">
          <CardTitle className="text-primary/90 flex items-center font-medium">
            <PlusIcon className="mr-2 h-5 w-5" />
            {disabled ? "Sign in to add a server" : "Add New Server"}
          </CardTitle>
        </CardHeader>
      </Card>
      <MCPDialog mode="add" open={isDialogOpen} onOpenChange={setIsDialogOpen} isAuthenticated={!disabled} />
    </>
  )
}
