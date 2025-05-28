"use client"

import { MCP_SERVER_ICONS } from "@/components/icons"
import { MCPDialog } from "@/components/mcp/mcp-dialog"
import { ToolsPopover } from "@/components/mcp/tools-popover"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useMCPContext } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn, getServerConfigWithEnv } from "@/lib/utils"
import type { MCPServer, MCPServerConfig } from "@dojo/config/src/types"
import { Settings } from "lucide-react"
import { useState } from "react"

interface MCPCardProps {
  server: MCPServer
  onDelete?: (serverId: string) => void
}

export function MCPCard({ server, onDelete }: MCPCardProps) {
  const { play } = useSoundEffectContext()
  const { readStorage, writeStorage, removeStorage } = useLocalStorage()
  const { getConnectionStatus, connect, disconnect, activeConnections } = useMCPContext()

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [config, setConfig] = useState<MCPServerConfig | undefined>(() => {
    const storedConfig = readStorage<MCPServerConfig>(`mcp_config_${server.id}`)
    return storedConfig || server.config
  })

  const connectionStatus = getConnectionStatus(server.id)
  const serverConnection = activeConnections.find((conn) => conn.serverId === server.id)
  const isConnected = connectionStatus === "connected"
  const Icon = MCP_SERVER_ICONS[server.id]

  const handleConnect = async () => {
    play("./sounds/click.mp3", { volume: 0.5 })

    if (isConnected) {
      await disconnect(server.id)
      return
    }

    const configToUse = getServerConfigWithEnv({ ...server, config })
    await connect({ server: { ...server, config: configToUse } })
  }

  const handleSaveConfig = (newConfig: MCPServerConfig) => {
    setConfig(newConfig)
    writeStorage(`mcp_config_${server.id}`, newConfig)
  }

  const handleDelete = () => {
    removeStorage(`mcp_config_${server.id}`)
    onDelete?.(server.id)
  }

  return (
    <>
      <Card
        className={cn(
          "relative h-[10rem] max-h-[10rem] w-full max-w-xs border",
          isConnected && "border-primary/80 bg-muted/50 border-2",
        )}
      >
        {server.localOnly && (
          <div className="absolute top-2 right-2 z-10 bg-secondary/80 border px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Local only
          </div>
        )}

        <CardHeader>
          <div className="flex items-center gap-2">
            {Icon && <Icon />}
            <CardTitle className="text-primary/90 font-medium">{server.name}</CardTitle>
            {isConnected && <div className="ml-2 h-2 w-2 rounded-full bg-green-500" />}
          </div>
          <CardDescription className="w-[90%]">{server.summary}</CardDescription>
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
              onClick={() => {
                play("./sounds/click.mp3", { volume: 0.5 })
                setIsConfigDialogOpen(true)
              }}
              className="bg-secondary/80 hover:bg-secondary/90 h-9 w-9 border hover:cursor-pointer"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {isConnected && <ToolsPopover tools={serverConnection?.tools || {}} />}
          </div>
        </CardFooter>
      </Card>

      <MCPDialog
        mode="edit"
        server={{ ...server, config }}
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        onSaveConfig={handleSaveConfig}
        onDelete={handleDelete}
      />
    </>
  )
}
