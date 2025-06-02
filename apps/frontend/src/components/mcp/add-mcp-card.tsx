"use client"

import { MCPDialog } from "@/components/mcp/mcp-dialog"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { PlusIcon } from "lucide-react"
import { useState } from "react"

export function AddMCPCard() {
  const { play } = useSoundEffectContext()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Card
        className="hover:border-primary/80 hover:bg-muted/50 relative h-[10rem] max-h-[10rem] w-full max-w-[16rem] cursor-pointer border border-dashed border-2 transition-colors"
        onMouseDown={() => {
          play("./sounds/click.mp3", { volume: 0.5 })
        }}
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader className="flex h-full items-center justify-center">
          <CardTitle className="text-primary/90 flex items-center font-medium">
            <PlusIcon className="mr-2 h-5 w-5" />
            Add New Server
          </CardTitle>
        </CardHeader>
      </Card>
      <MCPDialog mode="add" open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  )
}
