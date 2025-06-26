"use client"

import { AgentDeleteDialog } from "@/components/agent/agent-delete-dialog"
import { AgentDialog } from "@/components/agent/agent-dialog"
import { AgentSidebar } from "@/components/agent/agent-sidebar"
import { Button } from "@/components/ui/button"
import { useAgent } from "@/hooks/use-agent"
import { useAIModels } from "@/hooks/use-ai-models"
import { cn } from "@/lib/utils"
import type { Agent } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { Pencil, Play, Square } from "lucide-react"
import { useState, useCallback, useMemo } from "react"

export function Agent() {
  const { agents, runAgent, stopAllAgents, getRunningExecutions, getAgentExecution } = useAgent()
  const { isAuthenticated } = useConvexAuth()
  const { models } = useAIModels()

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null)

  // Get all executions for the sidebar
  const runningExecutions = getRunningExecutions()
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
      .filter(Boolean) as Array<{
      agentId: string
      status: "preparing" | "running" | "completed" | "failed"
      error?: string
    }>
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
      const { remove } = useAgent()
      await remove({ id: agentToDelete._id })
      // If the deleted agent was selected, clear the selection
      if (selectedAgent?._id === agentToDelete._id) {
        setSelectedAgent(null)
      }
      setAgentToDelete(null)
    }
  }, [agentToDelete, selectedAgent])

  const handleCreateAgent = useCallback(() => {
    setEditingAgent(null)
    setDialogMode("add")
    setIsDialogOpen(true)
  }, [])

  const handleSelectAgent = useCallback(
    (agent: Agent) => {
      // Toggle selection - if clicking the same agent, unselect it
      setSelectedAgent(selectedAgent?._id === agent._id ? null : agent)
    },
    [selectedAgent],
  )

  const handleRunAgent = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a._id === agentId)
      if (agent) {
        runAgent(agent)
      }
    },
    [agents, runAgent],
  )

  return (
    <>
      <div className="flex h-full bg-background">
        {/* Left Sidebar */}
        <div className="w-96 shrink-0 bg-card border-r-[1.5px] flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b-[1.5px] flex-shrink-0 flex items-center justify-between h-16">
            <p className="text-sm font-semibold">Agents</p>
            <span className="text-xs text-muted-foreground">{agents.length} total</span>
          </div>
          {/* Agent List */}
          <AgentSidebar
            agents={agents}
            selectedAgentId={selectedAgent?._id || null}
            isAuthenticated={isAuthenticated}
            executions={executions}
            onSelectAgent={handleSelectAgent}
            onCreateAgent={handleCreateAgent}
            onEditAgent={handleEditAgent}
            onDeleteAgent={handleDeleteAgent}
            onRunAgent={handleRunAgent}
          />
        </div>
        {/* Main Content */}
        <div className="flex flex-col flex-1">
          {selectedAgent ? (
            <>
              {/* Header */}
              <div className="p-4 border-b-[1.5px] flex-shrink-0 flex items-center justify-between w-full bg-card h-16">
                {/* Left section - Name and Edit */}
                <div className="flex items-center gap-2 flex-1">
                  <p className="text-sm font-semibold max-w-[160px] truncate">{selectedAgent.name}</p>
                  {/* Execution status dot */}
                  {(() => {
                    const status = selectedExecution?.status
                    const isRunning = status === "preparing" || status === "running"
                    const hasError = status === "failed"

                    if (isRunning && status === "running") return <div className="h-2 w-2 bg-green-500" />
                    if (isRunning && status === "preparing") return <div className="h-2 w-2 bg-yellow-500" />
                    if (hasError) return <div className="h-2 w-2 bg-red-500" />
                    return null
                  })()}
                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditAgent(selectedAgent)}
                    className="hover:cursor-pointer"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>

                {/* Right section - Run/Stop button */}
                <div className="flex items-center justify-end flex-1">
                  {(() => {
                    const status = selectedExecution?.status
                    const isRunning = status === "running"
                    const isPreparing = status === "preparing"

                    return (
                      <Button
                        className={cn(
                          "border-[1px] hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                          isRunning
                            ? "bg-red-700 hover:bg-red-800 text-white border-red-500 hover:border-red-800"
                            : "bg-green-700 hover:bg-green-800 text-white border-green-500 hover:border-green-800",
                        )}
                        onClick={() => (isRunning ? stopAllAgents() : handleRunAgent(selectedAgent._id))}
                        disabled={!isAuthenticated || isPreparing}
                      >
                        {isRunning ? (
                          <>
                            <Square className="h-3 w-3 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Run
                          </>
                        )}
                      </Button>
                    )
                  })()}
                </div>
              </div>

              {/* Content area - Agent Details (placeholder for now) */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-3xl">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">System Prompt</h3>
                      <p className="text-sm text-muted-foreground bg-muted/40 p-4 rounded-md">
                        {selectedAgent.systemPrompt}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Model</h3>
                        <p className="text-sm text-muted-foreground">{selectedModel?.name || "Unknown"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-2">Output Type</h3>
                        <p className="text-sm text-muted-foreground">{selectedAgent.outputType}</p>
                      </div>
                      {selectedAgent.mcpServers && selectedAgent.mcpServers.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">MCP Servers</h3>
                          <p className="text-sm text-muted-foreground">{selectedAgent.mcpServers.length} connected</p>
                        </div>
                      )}
                    </div>
                    {selectedExecution && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Execution Status</h3>
                        <p className="text-sm text-muted-foreground">
                          Status: {selectedExecution.status}
                          {selectedExecution.error && (
                            <span className="text-destructive block mt-1">{selectedExecution.error}</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select an agent</p>
            </div>
          )}
        </div>
      </div>
      {/* Dialog for Add/Edit */}
      <AgentDialog
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
