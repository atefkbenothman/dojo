import { MCPConnectionState } from "@/hooks/use-mcp"

interface MCPStatusIndicatorProps {
  status?: MCPConnectionState | null
  showText?: boolean
}

export function MCPStatusIndicator({ status, showText = false }: MCPStatusIndicatorProps) {
  // Don't show anything if there's no status or if disconnected
  if (!status || status.status === "disconnected") {
    return null
  }

  // Determine color and text based on status
  let colorClass: string
  let statusText: string

  switch (status.status) {
    case "connected":
      if (status.isStale) {
        colorClass = "bg-red-500"
        statusText = "Connection lost"
      } else {
        colorClass = "bg-green-500"
        statusText = "Connected"
      }
      break
    case "connecting":
      colorClass = "bg-yellow-500"
      statusText = "Connecting..."
      break
    case "disconnecting":
      colorClass = "bg-yellow-500"
      statusText = "Disconnecting..."
      break
    case "error":
      colorClass = "bg-red-500"
      statusText = "Error"
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
