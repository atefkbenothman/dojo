"use client"

import { AgentContentArea } from "@/components/agent/agent-content-area"
import { AgentDeleteDialog } from "@/components/agent/agent-delete-dialog"
import { AgentFormDialog } from "@/components/agent/agent-form-dialog"
import { AgentHeader } from "@/components/agent/agent-header"
import { AgentList } from "@/components/agent/agent-list"
import { Button } from "@/components/ui/button"
import { useAgent, type AgentExecution } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { cn } from "@/lib/utils"
import type { Agent } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { PanelLeft, PanelRight } from "lucide-react"
import { useState, useCallback, useMemo } from "react"

export function Agent() {
  const { agents, runAgent, stopAllAgents, getAgentExecution, clone, remove } = useAgent()
  const { isAuthenticated } = useConvexAuth()
  const { models } = useAIModels()

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Derive selected agent from agents array to ensure it's always up to date
  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null
    return agents.find((agent) => agent._id === selectedAgentId) || null
  }, [agents, selectedAgentId])

  // Get all executions for the sidebar
  const executions = useMemo(() => {
    return agents
      .map((agent) => {
        const execution = getAgentExecution(agent._id)
        if (!execution) return null
        return {
          agentId: agent._id,
          status: execution.status,
          error: execution.error,
        }
      })
      .filter(Boolean) as AgentExecution[]
  }, [agents, getAgentExecution])

  // Get selected agent's execution and model info
  const selectedExecution = selectedAgent ? getAgentExecution(selectedAgent._id) : null
  const selectedModel = useMemo(() => {
    if (!selectedAgent) return null
    return models.find((m) => m._id === selectedAgent.aiModelId)
  }, [models, selectedAgent])

  const handleEditAgent = useCallback((agent: Agent) => {
    setEditingAgent(agent)
    setDialogMode("edit")
    setIsDialogOpen(true)
  }, [])

  const handleDeleteAgent = useCallback((agent: Agent) => {
    setAgentToDelete(agent)
  }, [])

  const confirmDeleteAgent = useCallback(async () => {
    if (agentToDelete) {
      await remove({ id: agentToDelete._id })
      // If the deleted agent was selected, clear the selection
      if (selectedAgentId === agentToDelete._id) {
        setSelectedAgentId(null)
      }
      setAgentToDelete(null)
    }
  }, [agentToDelete, selectedAgentId, remove])

  const handleCreateAgent = useCallback(() => {
    setEditingAgent(null)
    setDialogMode("add")
    setIsDialogOpen(true)
  }, [])

  const handleSelectAgent = useCallback(
    (agent: Agent) => {
      // Toggle selection - if clicking the same agent, unselect it
      setSelectedAgentId(selectedAgentId === agent._id ? null : agent._id)
    },
    [selectedAgentId],
  )

  const handleRunAgent = useCallback(
    (agent: Agent) => {
      runAgent(agent)
    },
    [runAgent],
  )

  const handleCloneAgent = useCallback(
    async (agent: Agent) => {
      await clone(agent._id)
    },
    [clone],
  )

  return (
    <>
      <div className="flex h-full bg-background overflow-hidden">
        {/* Left Sidebar */}
        <div
          className={cn(
            "shrink-0 bg-card border-r-[1.5px] flex flex-col h-full",
            isSidebarCollapsed ? "w-[42px]" : "w-96",
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "border-b-[1.5px] flex-shrink-0 flex items-center h-[42px]",
              isSidebarCollapsed ? "justify-center" : "justify-between p-4",
            )}
          >
            {!isSidebarCollapsed && <p className="text-sm font-semibold">Agents</p>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn("hover:cursor-pointer", !isSidebarCollapsed && "ml-auto")}
            >
              {isSidebarCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </div>
          {/* Agent List */}
          <AgentList
            agents={agents}
            selectedAgentId={selectedAgentId}
            isAuthenticated={isAuthenticated}
            executions={executions}
            onSelectAgent={handleSelectAgent}
            onCreateAgent={handleCreateAgent}
            onEditAgent={handleEditAgent}
            onDeleteAgent={handleDeleteAgent}
            onCloneAgent={handleCloneAgent}
            onRunAgent={handleRunAgent}
            onStopAllAgents={stopAllAgents}
            isCollapsed={isSidebarCollapsed}
            onExpandSidebar={() => setIsSidebarCollapsed(false)}
          />
        </div>
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {selectedAgent ? (
            <>
              <AgentHeader
                agent={selectedAgent}
                execution={selectedExecution}
                isAuthenticated={isAuthenticated}
                onEdit={() => handleEditAgent(selectedAgent)}
                onRun={() => handleRunAgent(selectedAgent)}
                onStop={stopAllAgents}
              />
              <AgentContentArea
                agent={selectedAgent}
                model={selectedModel}
                execution={selectedExecution}
                isAuthenticated={isAuthenticated}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select an agent</p>
            </div>
          )}
        </div>
      </div>
      {/* Dialog for Add/Edit */}
      <AgentFormDialog
        mode={dialogMode}
        agent={editingAgent || undefined}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingAgent(null)
          }
        }}
        isAuthenticated={isAuthenticated}
      />
      {/* Delete Confirmation Dialog */}
      <AgentDeleteDialog
        agent={agentToDelete}
        open={!!agentToDelete}
        onOpenChange={(open) => !open && setAgentToDelete(null)}
        onConfirm={confirmDeleteAgent}
      />
    </>
  )
}
