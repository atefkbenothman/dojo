import { type AgentStatus } from "@/hooks/use-agent"

interface AgentStatusIndicatorProps {
  status?: AgentStatus | null
  showText?: boolean
}

export function AgentStatusIndicator({ status, showText = false }: AgentStatusIndicatorProps) {
  // Don't show anything if there's no status or if completed/cancelled
  if (!status || status === "completed" || status === "cancelled") {
    return null
  }
  
  // Determine color and text based on status
  let colorClass: string
  let statusText: string
  
  switch (status) {
    case "running":
      colorClass = "bg-green-500"
      statusText = "Running"
      break
    case "preparing":
      colorClass = "bg-yellow-500"
      statusText = "Preparing..."
      break
    case "connecting":
      colorClass = "bg-yellow-500"
      statusText = "Connecting..."
      break
    case "failed":
      colorClass = "bg-red-500"
      statusText = "Failed"
      break
    default:
      return null
  }

  if (showText) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={`h-2 w-2 rounded-full ${colorClass}`} />
        <span className="text-xs text-muted-foreground">{statusText}</span>
      </div>
    )
  }

  return <div className={`h-2 w-2 rounded-full ${colorClass}`} />
}
