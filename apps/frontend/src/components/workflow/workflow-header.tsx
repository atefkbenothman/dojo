"use client"

import { Button } from "@/components/ui/button"
import { Workflow } from "@dojo/db/convex/types"
import { Play, Pencil } from "lucide-react"
import { memo, ReactNode } from "react"

interface WorkflowHeaderProps {
  workflow: Workflow
  onEditClick: () => void
  onRunClick: () => void
  canRun: boolean
  tabsContent: ReactNode
}

export const WorkflowHeader = memo(function WorkflowHeader({
  workflow,
  onEditClick,
  onRunClick,
  canRun,
  tabsContent,
}: WorkflowHeaderProps) {
  return (
    <div className="border-b-[1.5px] flex-shrink-0 bg-card h-[42px] overflow-x-auto">
      <div className="px-4 grid grid-cols-3 items-center h-full min-w-fit">
        {/* Left section - Name and Edit */}
        <div className="flex items-center gap-2 justify-start">
          <p className="text-sm font-semibold whitespace-nowrap truncate">{workflow.name}</p>
          {/* Edit */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditClick}
            className="hover:cursor-pointer flex-shrink-0 h-8 w-8"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>

        {/* Center section - Tabs */}
        <div className="flex items-center justify-center">
          {tabsContent}
        </div>

        {/* Right section - Run button */}
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            className="bg-green-700 hover:bg-green-800 text-white border-green-500 border-[1px] hover:border-green-800 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-700 h-8"
            onClick={onRunClick}
            disabled={!canRun}
          >
            <Play className="h-3 w-3 mr-1" />
            Run
          </Button>
        </div>
      </div>
    </div>
  )
})
