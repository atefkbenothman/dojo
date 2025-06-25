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
  selectedWorkflowId: string | null
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
  selectedWorkflowId,
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
    <div className="flex flex-col bg-card flex-1 min-h-0">
      {/* Search */}
      <div className="relative w-full p-4 border-b-[1.5px]">
        <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
        <Input
          placeholder="Search workflows"
          className="h-9 pl-9 text-xs bg-background/50 focus-visible:ring-0"
          onChange={(e) => setSearchInput(e.target.value)}
          value={searchInput}
        />
      </div>
      {/* Create */}
      <div className="p-4 border-b-[1.5px]">
        <Button
          variant="outline"
          className="w-full h-10 hover:cursor-pointer"
          onClick={onCreateWorkflow}
          disabled={!isAuthenticated}
        >
          Create Workflow
        </Button>
      </div>
      {/* Workflow List */}
      <div className="flex flex-col gap-4 overflow-y-auto flex-1 p-4 no-scrollbar">
        {filteredWorkflows.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">
              {searchInput ? "No workflows found" : "Build your first workflow"}
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
                isSelected={selectedWorkflowId === workflow._id}
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
  )
})
