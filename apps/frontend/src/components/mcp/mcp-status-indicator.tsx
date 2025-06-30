import { isMCPConnected, isMCPConnecting, isMCPError, MCPConnectionState } from "@/hooks/use-mcp"
import { memo } from "react"

interface MCPStatusIndicatorProps {
  status?: MCPConnectionState | null
}

export const MCPStatusIndicator = memo(function MCPStatusIndicator({ status }: MCPStatusIndicatorProps) {
  if (isMCPConnected(status)) return <div className="h-2 w-2 rounded-full bg-green-500" />
  if (isMCPConnecting(status)) return <div className="h-2 w-2 rounded-full bg-yellow-500" />
  if (isMCPError(status)) return <div className="h-2 w-2 rounded-full bg-red-500" />
  return null
})
