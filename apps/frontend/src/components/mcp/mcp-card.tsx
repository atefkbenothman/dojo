"use client"

import { MCP_SERVER_ICONS } from "@/components/icons"
import { MCPDialog } from "@/components/mcp/mcp-dialog"
import { ToolsPopover } from "@/components/mcp/tools-popover"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useMCPContext } from "@/hooks/use-mcp"
import { cn } from "@/lib/utils"
import type { MCPServer } from "@dojo/config/src/types"
import { Settings } from "lucide-react"
import { useState } from "react"

interface MCPCardProps {
  server: MCPServer
}

export function MCPCard({ server }: MCPCardProps) {
  const { getConnectionStatus, connect, disconnect, activeConnections } = useMCPContext()

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)

  const connectionStatus = getConnectionStatus(server.id)
  const serverConnection = activeConnections.find((conn) => conn.serverId === server.id)
  const isConnected = connectionStatus === "connected"
  const Icon = MCP_SERVER_ICONS[server.id]

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect(server.id)
      return
    }
    await connect([server])
  }

  return (
    <>
      <Card
        className={cn(
          "relative h-[10rem] max-h-[10rem] w-full max-w-[16rem] border flex flex-col overflow-hidden",
          isConnected && "border-primary/80 bg-muted/50 border-2",
        )}
      >
        {server.localOnly && (
          <div className="absolute top-2 right-2 z-10 bg-secondary/80 border px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Local only
          </div>
        )}

        <CardHeader className="flex-1 min-h-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon />}
            <CardTitle className="text-primary/90 font-medium">{server.name}</CardTitle>
            {isConnected && <div className="ml-2 h-2 w-2 rounded-full bg-green-500" />}
          </div>
          <CardDescription className="w-[90%] line-clamp-2 overflow-hidden">{server.summary}</CardDescription>
        </CardHeader>

        <CardFooter className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={isConnected ? "default" : "secondary"}
              onClick={handleConnect}
              disabled={connectionStatus === "connecting"}
              className={cn(
                "border hover:cursor-pointer",
                isConnected ? "bg-primary hover:bg-primary" : "bg-secondary/80 hover:bg-secondary/90",
              )}
            >
              {connectionStatus === "connecting" ? "Connecting..." : isConnected ? "Disconnect" : "Connect"}
            </Button>

            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsConfigDialogOpen(true)}
              className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {isConnected && <ToolsPopover tools={serverConnection?.tools || {}} />}
          </div>
        </CardFooter>
      </Card>
      <MCPDialog mode="edit" server={server} open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen} />
    </>
  )
}
