"use client"

import { AgentList } from "@/components/agent/agent-list"
import { Button } from "@/components/ui/button"
import type { AgentExecution } from "@/hooks/use-agent"
import { useSidebar } from "@/hooks/use-sidebar"
import { cn } from "@/lib/utils"
import type { Agent } from "@dojo/db/convex/types"
import { PanelLeft, PanelRight } from "lucide-react"

interface AgentSidebarProps {
  agents: Agent[]
  selectedAgentId: string | null
  isAuthenticated: boolean
  executions: AgentExecution[]
  onSelectAgent: (agent: Agent) => void
  onCreateAgent: () => void
  onEditAgent: (agent: Agent) => void
  onDeleteAgent: (agent: Agent) => void
  onCloneAgent: (agent: Agent) => void
  onRunAgent: (agent: Agent) => void
  onStopAllAgents: () => void
  onGenerateAgent: () => void
}

export function AgentSidebar({
  agents,
  selectedAgentId,
  isAuthenticated,
  executions,
  onSelectAgent,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
  onCloneAgent,
  onRunAgent,
  onStopAllAgents,
  onGenerateAgent,
}: AgentSidebarProps) {
  const { isCollapsed, toggleSidebar, expandSidebar } = useSidebar()

  return (
    <div className={cn("shrink-0 bg-card border-r-[1.5px] flex flex-col h-full", isCollapsed ? "w-[42px]" : "w-96")}>
      {/* Header */}
      <div
        className={cn(
          "border-b-[1.5px] flex-shrink-0 flex items-center h-[42px]",
          isCollapsed ? "justify-center" : "justify-between p-4",
        )}
      >
        {!isCollapsed && <p className="text-sm font-semibold">Agents</p>}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn("hover:cursor-pointer", !isCollapsed && "ml-auto")}
        >
          {isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </div>
      {/* Agent List */}
      <AgentList
        agents={agents}
        selectedAgentId={selectedAgentId}
        isAuthenticated={isAuthenticated}
        executions={executions}
        onSelectAgent={onSelectAgent}
        onCreateAgent={onCreateAgent}
        onEditAgent={onEditAgent}
        onDeleteAgent={onDeleteAgent}
        onCloneAgent={onCloneAgent}
        onRunAgent={onRunAgent}
        onStopAllAgents={onStopAllAgents}
        onGenerateAgent={onGenerateAgent}
        isCollapsed={isCollapsed}
        onExpandSidebar={expandSidebar}
      />
    </div>
  )
}
