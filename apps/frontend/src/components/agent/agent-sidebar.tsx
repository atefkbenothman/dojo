"use client"

import { AgentServerCard } from "@/components/agent/agent-server-card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { Agent } from "@dojo/db/convex/types"
import { Search } from "lucide-react"
import { useState, memo, useMemo } from "react"

interface AgentExecution {
  agentId: string
  status: "preparing" | "running" | "completed" | "failed"
  error?: string
}

interface AgentSidebarProps {
  agents: Agent[]
  selectedAgentId: string | null
  isAuthenticated: boolean
  executions: AgentExecution[]
  onSelectAgent: (agent: Agent) => void
  onCreateAgent: () => void
  onEditAgent: (agent: Agent) => void
  onDeleteAgent: (agent: Agent) => void
  onRunAgent: (agentId: string) => void
}

export const AgentSidebar = memo(function AgentSidebar({
  agents,
  selectedAgentId,
  isAuthenticated,
  executions,
  onSelectAgent,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
  onRunAgent,
}: AgentSidebarProps) {
  const [searchInput, setSearchInput] = useState<string>("")

  // Separate agents into running, public and user agents
  const { runningAgents, publicAgents, userAgents } = useMemo(() => {
    const running: Agent[] = []
    const publicList: Agent[] = []
    const user: Agent[] = []

    agents.forEach((agent) => {
      // Check if agent is running
      const execution = executions.find((exec) => exec.agentId === agent._id)
      const isRunning = execution?.status === "preparing" || execution?.status === "running"

      if (isRunning) {
        running.push(agent)
      }

      if (agent.isPublic) {
        publicList.push(agent)
      } else {
        user.push(agent)
      }
    })

    return { runningAgents: running, publicAgents: publicList, userAgents: user }
  }, [agents, executions])

  // Filter agents based on search
  const filterAgents = (agentList: Agent[]) => {
    if (searchInput === "") return agentList
    return agentList.filter(
      (agent) =>
        agent.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        agent.systemPrompt?.toLowerCase().includes(searchInput.toLowerCase()),
    )
  }

  const filteredRunningAgents = filterAgents(runningAgents)
  const filteredPublicAgents = filterAgents(publicAgents)
  const filteredUserAgents = filterAgents(userAgents)

  // Determine which accordion sections should be open by default
  const defaultOpenSections = useMemo(() => {
    return [] // All sections closed by default
  }, [])

  return (
    <div className="flex flex-col bg-card flex-1 min-h-0 overflow-y-auto no-scrollbar relative">
      {/* Search */}
      <div className="sticky top-0 z-50 bg-card">
        <div className="relative w-full p-4 border-b-[1.5px]">
          <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
          <Input
            placeholder="Search agents"
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
            onClick={onCreateAgent}
            disabled={!isAuthenticated}
          >
            Add Agent
          </Button>
        </div>
      </div>
      {/* Agent List with Accordion Sections */}
      <Accordion type="multiple" defaultValue={defaultOpenSections} className="w-full">
        {/* Running Agents Section */}
        <AccordionItem value="running">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card z-10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Running</span>
              <span className="text-xs text-muted-foreground">({filteredRunningAgents.length})</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 py-4">
            <div className="flex flex-col gap-4">
              {filteredRunningAgents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  {searchInput ? "No running agents match your search" : "No agents are currently running"}
                </p>
              ) : (
                filteredRunningAgents.map((agent) => {
                  const execution = executions.find((exec) => exec.agentId === agent._id)
                  return (
                    <div key={agent._id} className="cursor-pointer" onClick={() => onSelectAgent(agent)}>
                      <AgentServerCard
                        agent={agent}
                        isAuthenticated={isAuthenticated}
                        onEditClick={onEditAgent}
                        onDeleteClick={onDeleteAgent}
                        isSelected={selectedAgentId === agent._id}
                        onRun={() => onRunAgent(agent._id)}
                        execution={execution}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <div className="border-b-[1px]" />

        {/* Public Agents Section */}
        <AccordionItem value="public">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card z-10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Public Agents</span>
              <span className="text-xs text-muted-foreground">({filteredPublicAgents.length})</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 py-4">
            <div className="flex flex-col gap-4">
              {filteredPublicAgents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  {searchInput ? "No public agents match your search" : "No public agents available"}
                </p>
              ) : (
                filteredPublicAgents.map((agent) => {
                  const execution = executions.find((exec) => exec.agentId === agent._id)
                  return (
                    <div key={agent._id} className="cursor-pointer" onClick={() => onSelectAgent(agent)}>
                      <AgentServerCard
                        agent={agent}
                        isAuthenticated={isAuthenticated}
                        onEditClick={onEditAgent}
                        onDeleteClick={onDeleteAgent}
                        isSelected={selectedAgentId === agent._id}
                        onRun={() => onRunAgent(agent._id)}
                        execution={execution}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <div className="border-b-[1px]" />

        {/* User Agents Section - Always shown */}
        <AccordionItem value="user" className="">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card z-10 border-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">My Agents</span>
              {isAuthenticated && <span className="text-xs text-muted-foreground">({filteredUserAgents.length})</span>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 py-4">
            <div className="flex flex-col gap-4">
              {!isAuthenticated ? (
                <p className="text-xs text-muted-foreground py-2">Sign in to create your own agents</p>
              ) : filteredUserAgents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {searchInput ? "No personal agents match your search" : "You haven't created any agents yet"}
                </p>
              ) : (
                filteredUserAgents.map((agent) => {
                  const execution = executions.find((exec) => exec.agentId === agent._id)
                  return (
                    <div key={agent._id} className="cursor-pointer" onClick={() => onSelectAgent(agent)}>
                      <AgentServerCard
                        agent={agent}
                        isAuthenticated={isAuthenticated}
                        onEditClick={onEditAgent}
                        onDeleteClick={onDeleteAgent}
                        isSelected={selectedAgentId === agent._id}
                        onRun={() => onRunAgent(agent._id)}
                        execution={execution}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <div className="border-b-[1px]" />
      </Accordion>
    </div>
  )
})
