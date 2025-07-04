import { isAgentError, type AgentStatus } from "@/hooks/use-agent"
import { memo } from "react"

interface AgentStatusIndicatorProps {
  status?: AgentStatus | null
}

export const AgentStatusIndicator = memo(function AgentStatusIndicator({ status }: AgentStatusIndicatorProps) {
  if (status === "running") return <div className="h-2 w-2 bg-green-500" />
  if (status === "preparing") return <div className="h-2 w-2 bg-yellow-500" />
  if (status === "connecting") return <div className="h-2 w-2 bg-yellow-500" />
  if (isAgentError(status)) return <div className="h-2 w-2 bg-red-500" />
  return null
})
