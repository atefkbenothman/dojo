"use client"

import { Input } from "@/components/ui/input"
import { WorkflowCard } from "@/components/workflow/workflow-card"
import { useWorkflowProvider } from "@/hooks/use-workflow"
import type { AgentWorkflow } from "@dojo/config"
import { useEffect, useState } from "react"

export function Workflow() {
  const { allAvailableWorkflows } = useWorkflowProvider()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredWorkflows, setFilteredWorkflows] = useState<Record<string, AgentWorkflow>>(allAvailableWorkflows)

  useEffect(() => {
    const filtered =
      searchInput === ""
        ? allAvailableWorkflows
        : Object.fromEntries(
            Object.entries(allAvailableWorkflows).filter(([, workflow]) =>
              workflow.name.toLowerCase().startsWith(searchInput.toLowerCase()),
            ),
          )
    setFilteredWorkflows(filtered)
  }, [searchInput, allAvailableWorkflows])

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 border-b p-4 sticky top-0 z-30 bg-card">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Workflows</p>
          <p className="text-xs text-muted-foreground">create and run custom workflows</p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center border-b pb-4 md:border-0 md:pb-0 md:mx-0 md:px-0 -mx-4 px-4">
          <Input
            placeholder="Search"
            className="ring-none bg-input/30 h-10 resize-none border-border focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border w-[16rem] text-xs"
            onChange={(e) => setSearchInput(e.target.value)}
            value={searchInput}
          />
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-4 p-4">
        {Object.entries(filteredWorkflows).map(([key, workflow]) => (
          <WorkflowCard key={key} workflow={workflow} />
        ))}
      </div>
    </div>
  )
}
