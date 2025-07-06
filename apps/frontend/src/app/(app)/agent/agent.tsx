"use client"

import { AgentContentArea } from "@/components/agent/agent-content-area"
import { AgentDeleteDialog } from "@/components/agent/agent-delete-dialog"
import { AgentFormDialog } from "@/components/agent/agent-form-dialog"
import { AgentGenerateDialog } from "@/components/agent/agent-generate-dialog"
import { AgentHeader } from "@/components/agent/agent-header"
import { AgentSidebar } from "@/components/agent/agent-sidebar"
import { useAgent, type AgentExecution } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { useAuth } from "@/hooks/use-auth"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { successToastStyle } from "@/lib/styles"
import type { Agent } from "@dojo/db/convex/types"
import { useState, useCallback, useMemo } from "react"
import { toast } from "sonner"

export function Agent() {
  const { agents, runAgent, stopAllAgents, getAgentExecution, clone, remove, checkAgentDependencies } = useAgent()
  const { isAuthenticated } = useAuth()
  const { models } = useAIModels()
  const { play } = useSoundEffectContext()

  const { selectedId: selectedAgentId, setSelectedId: setSelectedAgentId } = useUrlSelection()
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null)
  const [affectedWorkflows, setAffectedWorkflows] = useState<
    Array<{ id: string; name: string; nodeCount: number; isPublic?: boolean }> | undefined
  >()
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)

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

  const handleDeleteAgent = useCallback(
    async (agent: Agent) => {
      // Check dependencies before showing dialog
      const deps = await checkAgentDependencies(agent._id)
      setAffectedWorkflows(deps?.workflows || [])
      setAgentToDelete(agent)
    },
    [checkAgentDependencies],
  )

  const confirmDeleteAgent = useCallback(
    async (force?: boolean) => {
      if (agentToDelete) {
        try {
          await remove(agentToDelete._id, force)

          // Show success toast
          const actionText = force ? "Force deleted" : "Deleted"
          toast.success(`${actionText} ${agentToDelete.name} agent`, {
            icon: null,
            duration: 3000,
            position: "bottom-center",
            style: successToastStyle,
          })
          play("./sounds/delete.mp3", { volume: 0.5 })

          // If the deleted agent was selected, clear the selection
          if (selectedAgentId === agentToDelete._id) {
            setSelectedAgentId(null)
          }
          setAgentToDelete(null)
          setAffectedWorkflows(undefined)
        } catch (error) {
          // If it's a dependency error and we haven't forced, the dialog should stay open
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
          setAgentToDelete(null)
          setAffectedWorkflows(undefined)
        }
      }
    },
    [agentToDelete, selectedAgentId, remove, play],
  )

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
    [selectedAgentId, setSelectedAgentId],
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

  const handleGenerateAgent = useCallback(() => {
    setIsGenerateDialogOpen(true)
  }, [])

  const handleAgentCreated = useCallback(
    (agentId: string) => {
      // Auto-select the newly created agent
      setSelectedAgentId(agentId)
    },
    [setSelectedAgentId],
  )

  return (
    <>
      <div className="flex h-full bg-background overflow-hidden">
        {/* Left Sidebar */}
        <AgentSidebar
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
          onGenerateAgent={handleGenerateAgent}
        />
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-x-hidden">
          {selectedAgent ? (
            <>
              <AgentHeader
                agent={selectedAgent}
                execution={selectedExecution}
                onEdit={() => handleEditAgent(selectedAgent)}
                onRun={() => handleRunAgent(selectedAgent)}
                onStop={stopAllAgents}
              />
              <AgentContentArea
                agent={selectedAgent}
                model={selectedModel}
                execution={selectedExecution}
                onDeleteClick={handleDeleteAgent}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                {selectedAgentId && Array.isArray(agents) ? "Agent does not exist" : "Select an agent"}
              </p>
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
        onAgentCreated={handleAgentCreated}
      />
      {/* Delete Confirmation Dialog */}
      <AgentDeleteDialog
        agent={agentToDelete}
        open={!!agentToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setAgentToDelete(null)
            setAffectedWorkflows(undefined)
          }
        }}
        onConfirm={confirmDeleteAgent}
        affectedWorkflows={affectedWorkflows}
      />
      {/* Generate Agent Dialog */}
      <AgentGenerateDialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen} />
    </>
  )
}
