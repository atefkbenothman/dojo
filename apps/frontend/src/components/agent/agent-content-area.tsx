import { AgentForm } from "@/components/agent/form/agent-form"
import { type AgentStatus } from "@/hooks/use-agent"
import type { Doc } from "@dojo/db/convex/_generated/dataModel"
import type { Agent } from "@dojo/db/convex/types"

interface AgentContentAreaProps {
  agent: Agent
  model: Doc<"models"> | null | undefined
  execution: {
    status: AgentStatus
    error?: string
  } | null
  isAuthenticated?: boolean
  onDeleteClick?: (agent: Agent) => void
}

export function AgentContentArea({ agent, model, execution, isAuthenticated = false, onDeleteClick }: AgentContentAreaProps) {
  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex flex-col">
          <div className="max-w-4xl w-full px-0 sm:px-4 py-0 sm:py-8 h-full sm:h-auto flex flex-col sm:mx-auto sm:my-auto">
            <div className="h-full sm:h-auto min-w-[320px]">
              <AgentForm
                agent={agent}
                mode="edit"
                variant="page"
                isAuthenticated={isAuthenticated}
                execution={execution}
                onDeleteClick={onDeleteClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
