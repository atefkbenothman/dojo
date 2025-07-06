"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { WorkflowListItem } from "@/components/workflow/workflow-list-item"
import { useGeneration } from "@/hooks/use-generation"
import { useSidebar } from "@/hooks/use-sidebar"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Workflow, WorkflowExecution } from "@dojo/db/convex/types"
import { Search, Globe, Plus, Play, Layers, Sparkles } from "lucide-react"
import { useState, useMemo, useCallback, memo } from "react"

interface WorkflowListProps {
  workflows: Workflow[]
  selectedWorkflowId: string | null
  isAuthenticated: boolean
  workflowExecutions: WorkflowExecution[]
  onSelectWorkflow: (workflow: Workflow) => void
  onCreateWorkflow: () => void
  onEditWorkflow: (workflow: Workflow) => void
  onDeleteWorkflow: (workflow: Workflow) => void
  onCloneWorkflow: (workflow: Workflow) => void
  onRunWorkflow: (workflow: Workflow) => void
  onStopWorkflow: (workflowId: Id<"workflows">) => void
  onGenerateWorkflow?: () => void
  isCollapsed: boolean
  onExpandSidebar: () => void
}

export const WorkflowList = memo(function WorkflowList({
  workflows,
  selectedWorkflowId,
  isAuthenticated,
  workflowExecutions,
  onSelectWorkflow,
  onCreateWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onCloneWorkflow,
  onRunWorkflow,
  onStopWorkflow,
  onGenerateWorkflow,
  isCollapsed,
  onExpandSidebar,
}: WorkflowListProps) {
  const [searchInput, setSearchInput] = useState<string>("")
  const { getAccordionSections, setAccordionSections } = useSidebar()
  const openSections = getAccordionSections("workflows")

  // Memoize workflowExecutions as a stable reference for comparisons
  const workflowExecutionsStable = useMemo(() => {
    // Convert array to a plain object for efficient lookup
    const executions: Record<string, WorkflowExecution> = {}
    workflowExecutions.forEach((execution) => {
      // Get the most recent execution for each workflow
      const currentExecution = executions[execution.workflowId]
      if (!currentExecution || execution.startedAt > currentExecution.startedAt) {
        executions[execution.workflowId] = execution
      }
    })
    return executions
  }, [workflowExecutions])

  // Memoize the workflow categorization to prevent unnecessary recalculations
  const workflowCategories = useMemo(() => {
    const running: Workflow[] = []
    const global: Workflow[] = []
    const user: Workflow[] = []

    workflows.forEach((workflow) => {
      // Check if workflow is running using the stable executions object
      const execution = workflowExecutionsStable[workflow._id]
      const isRunning = execution?.status === "preparing" || execution?.status === "running"

      if (isRunning) {
        running.push(workflow)
      }

      if (workflow.isPublic) {
        global.push(workflow)
      } else {
        user.push(workflow)
      }
    })

    return { runningWorkflows: running, globalWorkflows: global, userWorkflows: user }
  }, [workflows, workflowExecutionsStable])

  const { runningWorkflows, globalWorkflows, userWorkflows } = workflowCategories

  const { play } = useSoundEffectContext()
  const { isGeneratingWorkflow } = useGeneration()

  const handleClick = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  // Handlers for collapsed state
  const handleSearchClick = useCallback(() => {
    onExpandSidebar()
    // Focus search input immediately
    requestAnimationFrame(() => {
      const searchInput = document.querySelector('input[placeholder="Search workflows"]') as HTMLInputElement
      searchInput?.focus()
    })
  }, [onExpandSidebar])

  const handleSectionClick = useCallback(
    (section: string) => {
      onExpandSidebar()
      setAccordionSections("workflows", [section])
    },
    [onExpandSidebar, setAccordionSections],
  )

  const handleAddClick = useCallback(() => {
    onExpandSidebar()
    onCreateWorkflow()
  }, [onExpandSidebar, onCreateWorkflow])

  const handleGenerateClick = useCallback(() => {
    onExpandSidebar()
    onGenerateWorkflow?.()
  }, [onExpandSidebar, onGenerateWorkflow])

  // Memoize the filter function to prevent recreation on every render
  const filterWorkflows = useCallback(
    (workflowList: Workflow[]) => {
      if (searchInput === "") return workflowList
      return workflowList.filter((workflow) => workflow.name.toLowerCase().includes(searchInput.toLowerCase()))
    },
    [searchInput],
  )

  // Memoize filtered workflows to prevent unnecessary recalculations
  const filteredWorkflows = useMemo(
    () => ({
      running: filterWorkflows(runningWorkflows),
      global: filterWorkflows(globalWorkflows),
      user: filterWorkflows(userWorkflows),
    }),
    [filterWorkflows, runningWorkflows, globalWorkflows, userWorkflows],
  )

  const filteredRunningWorkflows = filteredWorkflows.running
  const filteredGlobalWorkflows = filteredWorkflows.global
  const filteredUserWorkflows = filteredWorkflows.user

  // Memoize the WorkflowListItem props to prevent unnecessary re-renders
  const createWorkflowListItemProps = useCallback(
    (workflow: Workflow) => ({
      workflow,
      onEditClick: onEditWorkflow,
      onDeleteClick: onDeleteWorkflow,
      onCloneClick: onCloneWorkflow,
      isSelected: selectedWorkflowId === workflow._id,
      onRun: () => onRunWorkflow(workflow),
      onStop: () => onStopWorkflow(workflow._id),
      execution: workflowExecutionsStable[workflow._id],
    }),
    [
      onEditWorkflow,
      onDeleteWorkflow,
      onCloneWorkflow,
      selectedWorkflowId,
      onRunWorkflow,
      onStopWorkflow,
      workflowExecutionsStable,
    ],
  )

  return (
    <div className="flex flex-col bg-card flex-1 min-h-0 overflow-y-auto no-scrollbar relative">
      {isCollapsed ? (
        // Collapsed state
        <div className="flex flex-col gap-4 py-2">
          {/* Search */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={handleSearchClick}
              onMouseDown={handleClick}
              className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Add */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={!isAuthenticated ? undefined : handleAddClick}
              onMouseDown={!isAuthenticated ? undefined : handleClick}
              className={cn(
                "group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border",
                !isAuthenticated && "opacity-50 cursor-not-allowed pointer-events-none",
              )}
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Plus className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Generate with AI */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={!isAuthenticated || !onGenerateWorkflow ? undefined : handleGenerateClick}
              onMouseDown={!isAuthenticated || !onGenerateWorkflow ? undefined : handleClick}
              className={cn(
                "group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border",
                (!isAuthenticated || !onGenerateWorkflow) && "opacity-50 cursor-not-allowed pointer-events-none",
              )}
            >
              <div className="text-primary/70 group-hover:text-primary">
                {isGeneratingWorkflow ? <LoadingAnimationInline /> : <Sparkles className="h-5 w-5" />}
              </div>
            </div>
          </div>

          <div className="w-full border-t-[1.5px]" />

          {/* Running */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={() => handleSectionClick("running")}
              onMouseDown={handleClick}
              className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Play className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* My Workflows */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={() => handleSectionClick("user")}
              onMouseDown={handleClick}
              className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Global */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={() => handleSectionClick("global")}
              onMouseDown={handleClick}
              className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Globe className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Expanded state
        <>
          {/* Search */}
          <div className="sticky top-0 z-30 bg-card">
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
                title={!isAuthenticated ? "Authentication required to create workflows" : undefined}
              >
                {isAuthenticated ? "Create Workflow" : "Sign in to create workflows"}
              </Button>
              {onGenerateWorkflow && (
                <Button
                  variant="default"
                  className="w-full h-10 hover:cursor-pointer mt-2"
                  onClick={onGenerateWorkflow}
                  disabled={!isAuthenticated}
                  title={!isAuthenticated ? "Authentication required to generate workflows" : undefined}
                >
                  {isGeneratingWorkflow ? (
                    <LoadingAnimationInline className="mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {isAuthenticated ? (isGeneratingWorkflow ? "Generating" : "Generate with AI") : "Sign in to generate"}
                </Button>
              )}
            </div>
          </div>
          {/* Workflow List with Accordion Sections */}
          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={(sections) => setAccordionSections("workflows", sections)}
            className="w-full"
          >
            {/* Running Workflows Section */}
            <AccordionItem value="running">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card z-10">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Running</span>
                  <span className="text-xs text-muted-foreground">({filteredRunningWorkflows.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 py-4">
                <div className="flex flex-col gap-4">
                  {filteredRunningWorkflows.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      {searchInput ? "No running workflows match your search" : "No workflows are currently running"}
                    </p>
                  ) : (
                    filteredRunningWorkflows.map((workflow) => (
                      <div key={workflow._id} className="cursor-pointer" onClick={() => onSelectWorkflow(workflow)}>
                        <WorkflowListItem {...createWorkflowListItemProps(workflow)} />
                      </div>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <div className="border-b-[1px]" />

            {/* User Workflows Section - Always shown */}
            <AccordionItem value="user" className="">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card z-10 border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">My Workflows</span>
                  {isAuthenticated && (
                    <span className="text-xs text-muted-foreground">({filteredUserWorkflows.length})</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 py-4">
                <div className="flex flex-col gap-4">
                  {!isAuthenticated ? (
                    <p className="text-xs text-muted-foreground py-2">Sign in to create your own workflows</p>
                  ) : filteredUserWorkflows.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {searchInput
                        ? "No personal workflows match your search"
                        : "You haven't created any workflows yet"}
                    </p>
                  ) : (
                    filteredUserWorkflows.map((workflow) => (
                      <div key={workflow._id} className="cursor-pointer" onClick={() => onSelectWorkflow(workflow)}>
                        <WorkflowListItem {...createWorkflowListItemProps(workflow)} />
                      </div>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <div className="border-b-[1px]" />

            <AccordionItem value="global">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card z-20">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Public</span>
                  <span className="text-xs text-muted-foreground">({filteredGlobalWorkflows.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 py-4">
                <div className="flex flex-col gap-4">
                  {filteredGlobalWorkflows.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      {searchInput ? "No global workflows match your search" : "No global workflows available"}
                    </p>
                  ) : (
                    filteredGlobalWorkflows.map((workflow) => (
                      <div key={workflow._id} className="cursor-pointer" onClick={() => onSelectWorkflow(workflow)}>
                        <WorkflowListItem {...createWorkflowListItemProps(workflow)} />
                      </div>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            <div className="border-b-[1px]" />
          </Accordion>
        </>
      )}
    </div>
  )
})
