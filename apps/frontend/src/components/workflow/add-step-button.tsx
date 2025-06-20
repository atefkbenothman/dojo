"use client"

import { AgentSelectorPopover } from "@/components/workflow/agent-selector-popover"
import { Agent } from "@dojo/db/convex/types"
import { memo } from "react"

interface AddStepButtonProps {
  agents: Agent[]
  onSelect: (agent: Agent) => void
}

export const AddStepButton = memo(function AddStepButton({ agents, onSelect }: AddStepButtonProps) {
  return (
    <div className="relative py-4 w-[280px] mx-auto">
      {/* Connecting line - centered */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-border" />

      {/* Button */}
      <div className="relative flex items-center justify-center">
        <AgentSelectorPopover agents={agents} onSelect={onSelect} />
      </div>
    </div>
  )
})
