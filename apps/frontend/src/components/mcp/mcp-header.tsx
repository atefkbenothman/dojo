import { MCPStatusIndicator } from "@/components/mcp/mcp-status-indicator"
import { Button } from "@/components/ui/button"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { isMCPConnected, isMCPConnecting, canConnectMCP, MCPConnectionState } from "@/hooks/use-mcp"
import { cn } from "@/lib/utils"
import type { MCPServer } from "@dojo/db/convex/types"
import { Pencil, Plug, Unplug, Copy } from "lucide-react"
import { memo } from "react"

interface MCPHeaderProps {
  server: MCPServer
  connectionStatus?: MCPConnectionState
  isAuthenticated: boolean
  onEdit: () => void
  onConnect: () => void
  onDisconnect: () => void
  onClone: () => void
}

export const MCPHeader = memo(function MCPHeader({
  server,
  connectionStatus,
  isAuthenticated,
  onEdit,
  onConnect,
  onDisconnect,
  onClone,
}: MCPHeaderProps) {
  const isConnected = isMCPConnected(connectionStatus)
  const isConnecting = isMCPConnecting(connectionStatus)
  const canConnect = canConnectMCP(server, isAuthenticated, connectionStatus)

  return (
    <div className="p-4 border-b-[1.5px] flex-shrink-0 flex items-center justify-between bg-card h-[42px]">
      {/* Left section - Name and Edit */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{server.name}</p>
        {/* Connection status dot */}
        {isConnecting ? <LoadingAnimationInline /> : <MCPStatusIndicator status={connectionStatus} />}
        {/* Edit */}
        {!server.isPublic && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="hover:cursor-pointer">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Right section - Connect/Disconnect or Clone button */}
      <div className="flex items-center justify-end flex-shrink-0 ml-4">
        {/* Show clone button for public servers requiring keys (when authenticated and not connected) */}
        {server.isPublic && server.requiresUserKey && isAuthenticated && !isConnected ? (
          <Button
            className="border-[1px] hover:cursor-pointer bg-blue-700 hover:bg-blue-800 text-white border-blue-500 hover:border-blue-800"
            onClick={onClone}
          >
            <Copy className="h-3 w-3 mr-1" />
            Clone to Configure
          </Button>
        ) : (
          <Button
            className={cn(
              "border-[1px] hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
              isConnected
                ? "bg-red-700 hover:bg-red-800 text-white border-red-500 hover:border-red-800 disabled:hover:bg-red-700"
                : "bg-green-700 hover:bg-green-800 text-white border-green-500 hover:border-green-800 disabled:hover:bg-green-700",
            )}
            onClick={isConnected ? onDisconnect : onConnect}
            disabled={isConnected ? false : (isConnecting || !canConnect)}
            title={
              !canConnect && !isAuthenticated && server.requiresUserKey
                ? "Login required to use servers with API keys"
                : undefined
            }
          >
            {isConnected ? (
              <>
                <Unplug className="h-3 w-3 mr-1" />
                Disconnect
              </>
            ) : (
              <>
                <Plug className="h-3 w-3 mr-1" />
                Connect
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
})
