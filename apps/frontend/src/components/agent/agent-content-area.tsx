import { AgentForm } from "@/components/agent/form/agent-form"
import { type AgentStatus } from "@/hooks/use-agent"
import type { Agent } from "@dojo/db/convex/types"

interface AgentContentAreaProps {
  agent: Agent
  execution: {
    status: AgentStatus
    error?: string
  } | null
  onDeleteClick?: (agent: Agent) => void
}

export function AgentContentArea({ agent, execution, onDeleteClick }: AgentContentAreaProps) {
  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex flex-col">
          <div className="max-w-4xl w-full px-0 sm:px-4 py-0 sm:py-8 h-full sm:h-auto flex flex-col sm:mx-auto sm:my-auto">
            <div className="h-full sm:h-auto min-w-[320px]">
              <AgentForm agent={agent} mode="edit" variant="page" execution={execution} onDeleteClick={onDeleteClick} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
