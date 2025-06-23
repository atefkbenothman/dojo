"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WorkflowCard } from "@/components/workflow/workflow-card"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow } from "@dojo/db/convex/types"
import { Search } from "lucide-react"
import { useState, memo } from "react"

interface WorkflowSidebarProps {
  workflows: Workflow[]
  selectedWorkflow: Workflow | null
  isAuthenticated: boolean
  workflowExecutions: Map<Id<"workflows">, any>
  agents: any[]
  onSelectWorkflow: (workflow: Workflow) => void
  onCreateWorkflow: () => void
  onEditWorkflow: (workflow: Workflow) => void
  onDeleteWorkflow: (workflow: Workflow) => void
  onRunWorkflow: (workflow: Workflow) => void
  onStopWorkflow: (workflowId: string) => void
}

export const WorkflowSidebar = memo(function WorkflowSidebar({
  workflows,
  selectedWorkflow,
  isAuthenticated,
  workflowExecutions,
  agents,
  onSelectWorkflow,
  onCreateWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onRunWorkflow,
  onStopWorkflow,
}: WorkflowSidebarProps) {
  const [searchInput, setSearchInput] = useState<string>("")

  // Filter workflows based on search
  const filteredWorkflows =
    searchInput === ""
      ? workflows
      : workflows.filter((workflow) => workflow.name.toLowerCase().includes(searchInput.toLowerCase()))

  return (
    <div className="w-96 border-r-[1.5px] flex flex-col flex-shrink-0 bg-card">
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">My Workflows</h3>
          <span className="text-xs text-muted-foreground">{workflows.length} total</span>
        </div>

        {/* Search input for workflows */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
          <Input
            placeholder="Search workflows..."
            className="h-9 pl-9 text-xs bg-background/50"
            onChange={(e) => setSearchInput(e.target.value)}
            value={searchInput}
          />
        </div>

        {/* Create workflow button */}
        <Button
          variant="outline"
          className="w-full h-10 hover:cursor-pointer"
          onClick={onCreateWorkflow}
          disabled={!isAuthenticated}
        >
          Create Workflow
        </Button>

        {/* Scrollable workflow list */}
        <div className="flex flex-col gap-3 overflow-y-auto flex-1">
          {filteredWorkflows.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">
                {searchInput ? (
                  "No workflows found"
                ) : (
                  <>
                    No workflows yet.
                    <br />
                    Create your first workflow below.
                  </>
                )}
              </p>
            </div>
          ) : (
            filteredWorkflows.map((workflow) => (
              <div key={workflow._id} className="cursor-pointer" onClick={() => onSelectWorkflow(workflow)}>
                <WorkflowCard
                  workflow={workflow}
                  isAuthenticated={isAuthenticated}
                  onEditClick={onEditWorkflow}
                  onDeleteClick={onDeleteWorkflow}
                  isSelected={selectedWorkflow?._id === workflow._id}
                  onRun={() => onRunWorkflow(workflow)}
                  onStop={() => onStopWorkflow(workflow._id)}
                  execution={workflowExecutions.get(workflow._id)}
                  agents={agents || []}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
})
