import { MCPForm } from "@/components/mcp/mcp-form"
import { Card } from "@/components/ui/card"
import { MCPConnectionState, isMCPConnected, isMCPConnecting, isMCPError, useMCP } from "@/hooks/use-mcp"
import { cn } from "@/lib/utils"
import type { MCPServer } from "@dojo/db/convex/types"
import { AlertCircle, CheckCircle2, Loader2, Wrench } from "lucide-react"
import { useMemo } from "react"

// Component for status section
interface StatusSectionProps {
  statusInfo: {
    icon: React.ReactNode
    text: string
    className: string
  } | null
}

function StatusSection({ statusInfo }: StatusSectionProps) {
  if (!statusInfo) return null

  return (
    <div className="space-y-3 mt-6 px-0 sm:px-0">
      <div className="flex items-center gap-2 px-4 sm:px-0">
        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        <h2 className="text-base sm:text-lg font-semibold">Status</h2>
      </div>
      <Card
        className={cn("p-3 sm:p-4 mx-0 sm:mx-0 rounded-none sm:rounded-lg border-0 sm:border", statusInfo.className)}
      >
        <div className="flex items-center gap-2">
          {statusInfo.icon}
          <span className="text-sm font-medium">{statusInfo.text}</span>
        </div>
      </Card>
    </div>
  )
}

// Component for tools section
interface ToolsSectionProps {
  tools?: Record<string, unknown>
}

function ToolsSection({ tools }: ToolsSectionProps) {
  if (!tools || Object.keys(tools).length === 0) return null

  const toolNames = Object.keys(tools)

  return (
    <div className="space-y-3 mt-6 px-0 sm:px-0">
      <div className="flex items-center gap-2 px-4 sm:px-0">
        <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        <h2 className="text-base sm:text-lg font-semibold">Available Tools</h2>
        <span className="text-sm text-muted-foreground">({toolNames.length})</span>
      </div>
      <Card className="p-3 sm:p-4 mx-0 sm:mx-0 rounded-none sm:rounded-lg border-0 sm:border">
        <div className="flex flex-wrap gap-2">
          {toolNames.map((toolName) => (
            <div key={toolName} className="bg-secondary/40 text-foreground rounded-md px-2 py-1 text-xs">
              {toolName}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

interface MCPContentAreaProps {
  server: MCPServer
  connectionStatus?: MCPConnectionState
  isAuthenticated?: boolean
}

export function MCPContentArea({ server, connectionStatus, isAuthenticated = false }: MCPContentAreaProps) {
  const { activeConnections } = useMCP()

  // Get tools for this server
  const tools = useMemo(() => {
    const connection = activeConnections.find((conn) => conn.serverId === server._id)
    return connection?.tools
  }, [activeConnections, server._id])

  // Get connection status info
  const statusInfo = useMemo(() => {
    if (!connectionStatus) return null

    const isConnected = isMCPConnected(connectionStatus)
    const isConnecting = isMCPConnecting(connectionStatus)
    const hasError = isMCPError(connectionStatus)

    if (isConnecting) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: "Connecting...",
        className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
      }
    }

    if (isConnected) {
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        text: "Connected",
        className: "text-green-600 bg-green-50 dark:bg-green-950/30",
      }
    }

    if (hasError) {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: connectionStatus.error || "Connection failed",
        className: "text-red-600 bg-red-50 dark:bg-red-950/30",
      }
    }

    return null
  }, [connectionStatus])

  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex flex-col">
          <div className="max-w-4xl w-full px-0 sm:px-4 py-0 sm:py-8 h-full sm:h-auto flex flex-col sm:mx-auto sm:my-auto">
            <div className="h-full sm:h-auto min-w-[320px]">
              <MCPForm server={server} mode="edit" variant="page" isAuthenticated={isAuthenticated} />
            </div>
            {/* Status Section */}
            <StatusSection statusInfo={statusInfo} />
            {/* Tools Section */}
            <ToolsSection tools={tools} />
          </div>
        </div>
      </div>
    </div>
  )
}
