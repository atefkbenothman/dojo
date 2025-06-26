"use client"

import { MCP_SERVER_ICONS } from "@/components/icons"
import { ToolsPopover } from "@/components/mcp/tools-popover"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useMCP } from "@/hooks/use-mcp"
import { cn } from "@/lib/utils"
import type { MCPServer } from "@dojo/db/convex/types"
import { Settings, Key } from "lucide-react"

interface MCPCardProps {
  server: MCPServer
  isProd?: boolean
  isAuthenticated?: boolean
  onEditClick?: (server: MCPServer) => void
}

export function MCPCard({ server, isProd = false, isAuthenticated = false, onEditClick }: MCPCardProps) {
  const { getConnection, activeConnections, connect, disconnect } = useMCP()

  const connection = getConnection(server._id)
  const status = connection?.isStale ? "error" : connection?.status || "disconnected"
  const error = connection?.isStale ? "Connection lost - no heartbeat" : connection?.error
  const isConnected = status === "connected"
  const isConnecting = status === "connecting"

  const serverConnection = activeConnections.find((conn) => conn.serverId === server._id)

  const disableConnect = (server.localOnly && isProd) || (!isAuthenticated && server.requiresUserKey)
  const connectDisabledReason =
    server.localOnly && isProd
      ? "Local-only servers cannot be connected to in production."
      : !isAuthenticated && server.requiresUserKey
        ? "You must be logged in to connect to this server."
        : undefined

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect(server._id)
      return
    }
    await connect([server._id])
  }

  const Icon = MCP_SERVER_ICONS[server.name.toLowerCase()] || null

  return (
    <Card
      className={cn(
        "relative h-[10rem] max-h-[10rem] w-full max-w-[16rem] border flex flex-col overflow-hidden",
        isConnected && "border-primary/80 bg-muted/50 border-2",
        status === "error" && "border-destructive/80 bg-destructive/5 border-2",
      )}
    >
      {(server.transportType || server.requiresUserKey) && (
        <div className="absolute top-2 right-2 z-10 flex flex-row items-center gap-2">
          {server.transportType && (
            <div className="bg-secondary/80 border px-2 py-1 text-xs font-medium text-muted-foreground flex items-center leading-none">
              {server.transportType.toUpperCase()}
            </div>
          )}
          {server.requiresUserKey && (
            <div className="bg-secondary/80 border px-2 py-1 text-xs font-medium text-muted-foreground flex items-center leading-none">
              <Key className="h-4 w-4 -mt-px" />
            </div>
          )}
        </div>
      )}
      <CardHeader className="flex-1 min-h-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon />}
          <CardTitle className="text-primary/90 font-medium">{server.name}</CardTitle>
          {isConnected && <div className="ml-2 h-2 w-2 rounded-full bg-green-500" />}
          {isConnecting && <div className="ml-2 h-2 w-2 rounded-full bg-yellow-500" />}
          {status === "error" && <div className="ml-2 h-2 w-2 rounded-full bg-red-500" />}
        </div>
        <CardDescription className="w-[90%] line-clamp-2 overflow-hidden">{server.summary}</CardDescription>
        {server.config && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {server.config.type === "stdio" ? `Command: ${server.config.command}` : `URL: ${server.config.url}`}
          </p>
        )}
        {error && status === "error" && <p className="text-xs text-destructive mt-1 line-clamp-1">{error}</p>}
      </CardHeader>
      <CardFooter className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isConnected ? "default" : "secondary"}
            onClick={handleConnect}
            disabled={isConnecting || disableConnect}
            className={cn(
              "border hover:cursor-pointer",
              isConnected ? "bg-primary hover:bg-primary" : "bg-secondary/80 hover:bg-secondary/90",
            )}
            title={connectDisabledReason}
          >
            {isConnecting ? "Connecting..." : isConnected ? "Disconnect" : "Connect"}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onEditClick?.(server)}
            className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </Button>
          {isConnected && <ToolsPopover tools={serverConnection?.tools || {}} />}
        </div>
      </CardFooter>
    </Card>
  )
}
