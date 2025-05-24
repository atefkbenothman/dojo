"use client"

import { MCPDialog } from "@/app/mcp/mcp-dialog"
import { MCP_SERVER_ICONS } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useMCPContext } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn, getServerConfigWithEnv } from "@/lib/utils"
import type { MCPServer, MCPServerConfig } from "@dojo/config/src/types"
import { Wrench } from "lucide-react"
import { useState, useEffect } from "react"

interface ToolsPopoverProps {
  tools: Record<string, unknown>
}

function ToolsPopover({ tools }: ToolsPopoverProps) {
  const { play } = useSoundEffectContext()

  const toolNames = Object.keys(tools)

  if (toolNames.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="bg-secondary/80 hover:bg-secondary/90 border hover:cursor-pointer"
          title={`Tools (${toolNames.length})`}
          onMouseDown={() => play("./click.mp3", { volume: 0.5 })}
        >
          <Wrench className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-2">
          <h4 className="font-medium">Available Tools ({toolNames.length})</h4>
          <div className="flex max-w-[250px] flex-wrap gap-2">
            {toolNames.map((toolName) => (
              <div key={toolName} className="bg-secondary/40 text-foreground rounded-md px-2 py-1 text-xs">
                {toolName}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface MCPCardProps {
  server: MCPServer
}

export function MCPCard({ server }: MCPCardProps) {
  const { play: playClick } = useSoundEffectContext()
  const { play: playSave } = useSoundEffectContext()

  const { readStorage, writeStorage } = useLocalStorage()
  const { getConnectionStatus, connect, disconnect, activeConnections } = useMCPContext()

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [config, setConfig] = useState<MCPServerConfig | undefined>(() => {
    const storedConfig = readStorage<MCPServerConfig>(`mcp_config_${server.id}`)
    return storedConfig || server.config
  })

  useEffect(() => {
    const storedConfig = readStorage<MCPServerConfig>(`mcp_config_${server.id}`)
    if (storedConfig) setConfig(storedConfig)
  }, [server.id, readStorage])

  const connectionStatus = getConnectionStatus(server.id)

  const serverConnection = activeConnections.find((conn) => conn.serverId === server.id)
  const isConnected = connectionStatus === "connected"

  const handleConnectClick = async () => {
    playClick("./click.mp3", { volume: 0.5 })
    if (isConnected) {
      await disconnect(server.id)
      return
    }
    const configToUse = getServerConfigWithEnv({ ...server, config })
    const serverToConnect: MCPServer = {
      ...server,
      config: configToUse,
    }
    await connect({ server: serverToConnect })
  }

  const handleSaveConfig = (newConfig: MCPServerConfig) => {
    const prevConfig = config || server.config
    const requiredEnvKeys = server.config?.requiresEnv || []
    const mergedEnv: Record<string, string> = {}
    for (const key of requiredEnvKeys) {
      mergedEnv[key] = newConfig.env?.[key] ?? prevConfig?.env?.[key] ?? ""
    }
    const mergedConfig: MCPServerConfig = {
      ...prevConfig,
      ...newConfig,
      env: mergedEnv,
    }
    setConfig(mergedConfig)
    writeStorage(`mcp_config_${server.id}`, mergedConfig)
    playSave("./save.mp3", { volume: 0.5 })
  }

  const Icon = MCP_SERVER_ICONS[server.id]

  return (
    <Card
      className={cn(
        "relative h-[10rem] max-h-[10rem] w-full max-w-xs border",
        isConnected && "border-primary/80 bg-muted/50",
      )}
    >
      {server.localOnly && (
        <div className="absolute top-2 right-2 z-10 bg-secondary/80 border border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Local only
        </div>
      )}
      <CardHeader>
        <div className="flex items-center gap-2">
          {Icon && <Icon />}
          <CardTitle className="text-primary/90 font-medium">{server.name}</CardTitle>
          {isConnected && <div className="ml-2 h-2 w-2 rounded-full bg-green-500"></div>}
        </div>
        <CardDescription className="w-[90%]">{server.summary}</CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isConnected ? "default" : "secondary"}
            onMouseDown={handleConnectClick}
            disabled={connectionStatus === "connecting"}
            className={cn(
              "border hover:cursor-pointer",
              isConnected ? "bg-primary hover:bg-primary" : "bg-secondary/80 hover:bg-secondary/90",
            )}
          >
            {connectionStatus === "connecting" ? "Connecting..." : isConnected ? "Disconnect" : "Connect"}
          </Button>

          <MCPDialog
            server={{ ...server, config }}
            onSaveConfig={handleSaveConfig}
            open={isConfigDialogOpen}
            onOpenChange={setIsConfigDialogOpen}
          />

          {isConnected && <ToolsPopover tools={serverConnection?.tools || {}} />}
        </div>
      </CardFooter>
    </Card>
  )
}
