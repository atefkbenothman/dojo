import { type AgentStatus, AGENT_STATUS } from "@/hooks/use-agent"

interface AgentStatusIndicatorProps {
  status?: AgentStatus
}

export function AgentStatusIndicator({ status }: AgentStatusIndicatorProps) {
  if (!status) return null

  switch (status) {
    case AGENT_STATUS.RUNNING:
      return <div className="h-2 w-2 bg-green-500" />
    case AGENT_STATUS.PREPARING:
      return <div className="h-2 w-2 bg-yellow-500" />
    case AGENT_STATUS.FAILED:
      return <div className="h-2 w-2 bg-red-500" />
    default:
      return null
  }
}
