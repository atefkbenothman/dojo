"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { Workflow } from "@dojo/db/convex/types"
import { Play, MoreVertical, Pencil, Trash } from "lucide-react"
import { useCallback, memo, useState } from "react"

interface WorkflowCardProps {
  workflow: Workflow
  isAuthenticated?: boolean
  onEditClick?: (workflow: Workflow) => void
  onDeleteClick?: (workflow: Workflow) => void
  isSelected?: boolean
  onRun?: (workflow: Workflow) => void
  isRunning?: boolean
}

export const WorkflowCard = memo(function WorkflowCard({
  workflow,
  isAuthenticated = false,
  onEditClick,
  onDeleteClick,
  isSelected = false,
  onRun,
  isRunning = false,
}: WorkflowCardProps) {
  const { play } = useSoundEffectContext()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleRun = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onRun) {
        onRun(workflow)
      }
    },
    [onRun, workflow],
  )

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setDropdownOpen(false)
      if (onEditClick) {
        onEditClick(workflow)
      }
    },
    [onEditClick, workflow],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setDropdownOpen(false)
      if (onDeleteClick) {
        onDeleteClick(workflow)
      }
    },
    [onDeleteClick, workflow],
  )

  const handleMouseDown = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  return (
    <Card
      className={cn(
        "h-14 w-full hover:bg-background/50 bg-background transition-colors",
        isSelected && "border-primary border-2 bg-background/50",
      )}
      onMouseDown={handleMouseDown}
    >
      <CardContent className="p-0 h-full">
        <div className="flex items-center h-full px-4 gap-3">
          {/* Name - takes up most space */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{workflow.name}</p>
          </div>

          {/* Step count - minimal badge */}
          <div className="flex items-center justify-center h-6 w-6 border text-xs font-medium">
            {workflow.steps.length}
          </div>

          {/* Run button - moved to where edit was */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRun}
            disabled={!isAuthenticated || isRunning}
            className={cn("h-8 w-8", isRunning && "text-primary")}
          >
            <Play className={cn("h-3.5 w-3.5", isRunning && "animate-pulse")} />
          </Button>

          {/* Dropdown menu for edit/delete */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!isAuthenticated || workflow.isPublic}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
})
