"use client"

import { Input } from "@/components/ui/input"
import { WorkflowCard } from "@/components/workflow/workflow-card"
import { useWorkflow } from "@/hooks/use-workflow"
import { Workflow as WorkflowType } from "@dojo/db/convex/types"
import { useEffect, useState } from "react"

export function Workflow() {
  const { workflows } = useWorkflow()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowType[]>(workflows)

  useEffect(() => {
    const filtered =
      searchInput === ""
        ? workflows
        : workflows.filter((workflow) => workflow.name.toLowerCase().includes(searchInput.toLowerCase()))
    setFilteredWorkflows(filtered)
  }, [searchInput, workflows])

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-4 sticky top-0 z-30 bg-background">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Workflows</p>
          <p className="text-xs text-muted-foreground">build and run custom workflows</p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Input
            placeholder="Search"
            className="ring-none bg-input/30 h-10 resize-none border-border focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border w-[16rem] text-xs"
            onChange={(e) => setSearchInput(e.target.value)}
            value={searchInput}
          />
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-4 px-4 pb-4">
        {filteredWorkflows.map((workflow) => (
          <WorkflowCard key={workflow._id} workflow={workflow} />
        ))}
      </div>
    </div>
  )
}
