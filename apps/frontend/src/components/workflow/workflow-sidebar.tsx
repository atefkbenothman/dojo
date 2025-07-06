"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PanelLeft, PanelRight } from "lucide-react"
import { useCallback } from "react"
import { WorkflowList } from "./workflow-list"
import { useWorkflow } from "@/hooks/use-workflow"
import { useAgent } from "@/hooks/use-agent"
import { useAuth } from "@/hooks/use-auth"
import { useSidebar } from "@/hooks/use-sidebar"
import type { Workflow } from "@dojo/db/convex/types"
import { Id } from "@dojo/db/convex/_generated/dataModel"

interface WorkflowSidebarProps {
  selectedWorkflowId: string | null
  onSelectWorkflow: (workflow: Workflow) => void
  onCreateWorkflow: () => void
  onEditWorkflow: (workflow: Workflow) => void
  onDeleteWorkflow: (workflow: Workflow) => void
  onCloneWorkflow: (workflow: Workflow) => void
  onRunWorkflow: (workflow: Workflow) => void
  onStopWorkflow: (workflowId: Id<"workflows">) => void
  onGenerateWorkflow: () => void
}

export function WorkflowSidebar({
  selectedWorkflowId,
  onSelectWorkflow,
  onCreateWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onCloneWorkflow,
  onRunWorkflow,
  onStopWorkflow,
  onGenerateWorkflow,
}: WorkflowSidebarProps) {
  // Get data from hooks
  const { workflows, executions } = useWorkflow()
  const { agents } = useAgent()
  const { isAuthenticated } = useAuth()
  const { isCollapsed, toggleSidebar, expandSidebar } = useSidebar()
  
  const handleExpandSidebar = useCallback(() => {
    expandSidebar()
  }, [expandSidebar])

  return (
    <div
      className={cn(
        "shrink-0 bg-card border-r-[1.5px] flex flex-col h-full",
        isCollapsed ? "w-[42px]" : "w-96",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "border-b-[1.5px] flex-shrink-0 flex items-center h-[42px]",
          isCollapsed ? "justify-center" : "justify-between p-4",
        )}
      >
        {!isCollapsed && <p className="text-sm font-semibold">Workflows</p>}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn("hover:cursor-pointer", !isCollapsed && "ml-auto")}
        >
          {isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </div>
      {/* Workflow List */}
      <WorkflowList
        workflows={workflows}
        selectedWorkflowId={selectedWorkflowId}
        isAuthenticated={isAuthenticated}
        workflowExecutions={executions}
        agents={agents || []}
        onSelectWorkflow={onSelectWorkflow}
        onCreateWorkflow={onCreateWorkflow}
        onEditWorkflow={onEditWorkflow}
        onDeleteWorkflow={onDeleteWorkflow}
        onCloneWorkflow={onCloneWorkflow}
        onRunWorkflow={onRunWorkflow}
        onStopWorkflow={onStopWorkflow}
        onGenerateWorkflow={onGenerateWorkflow}
        isCollapsed={isCollapsed}
        onExpandSidebar={handleExpandSidebar}
      />
    </div>
  )
}