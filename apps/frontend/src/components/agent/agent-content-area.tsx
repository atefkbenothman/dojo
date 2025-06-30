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
}

export function AgentContentArea({ agent, model, execution }: AgentContentAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">System Prompt</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 p-4 rounded-md">{agent.systemPrompt}</p>
          </div>
          <div className="flex gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Model</h3>
              <p className="text-sm text-muted-foreground">{model?.name || "Unknown"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Output Type</h3>
              <p className="text-sm text-muted-foreground">{agent.outputType}</p>
            </div>
            {agent.mcpServers && agent.mcpServers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">MCP Servers</h3>
                <p className="text-sm text-muted-foreground">{agent.mcpServers.length} connected</p>
              </div>
            )}
          </div>
          {execution && (
            <div>
              <h3 className="text-sm font-medium mb-2">Execution Status</h3>
              <p className="text-sm text-muted-foreground">
                Status: {execution.status}
                {execution.error && <span className="text-destructive block mt-1">{execution.error}</span>}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
