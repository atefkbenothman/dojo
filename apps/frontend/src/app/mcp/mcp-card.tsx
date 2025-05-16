"use client"

import { MCPDialog } from "./mcp-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useConnectionContext } from "@/hooks/use-connection"
import { MCP_CONFIG, MCP_CONFIG_ICONS } from "@/lib/config"
import { MCPServerConfig, Server } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Wrench } from "lucide-react"
import { useState } from "react"

interface ToolsPopoverProps {
  tools: Record<string, unknown>
}

function ToolsPopover({ tools }: ToolsPopoverProps) {
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
  server: Server
}

export function MCPCard({ server }: MCPCardProps) {
  const { getConnectionStatus, isConnected, connect, disconnect, activeConnections } = useConnectionContext()

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [currentConfig, setCurrentConfig] = useState<MCPServerConfig>(() => {
    const defaultConfig = MCP_CONFIG[server.id]
    if (defaultConfig) {
      return {
        id: server.id,
        name: server.name,
        command: defaultConfig.command,
        args: defaultConfig.args,
        env: defaultConfig.env,
      }
    }
    return {
      id: server.id,
      name: server.name,
      command: "",
      args: [],
      env: {},
    }
  })

  const serverConnected = isConnected(server.id)
  const connectionStatus = getConnectionStatus(server.id)
  const isConnecting = connectionStatus === "connecting"

  const serverConnection = activeConnections.find((conn) => conn.serverId === server.id)
  const tools = serverConnection?.tools || {}

  const handleConnectClick = async () => {
    if (serverConnected) {
      await disconnect(server.id)
    } else if (currentConfig) {
      try {
        await connect(currentConfig)
      } catch (error) {
        console.error("Failed to connect:", error)
      }
    }
  }

  const handleSaveConfig = (config: MCPServerConfig) => {
    setCurrentConfig(config)
  }

  return (
    <Card
      className={cn(
        "relative h-[10rem] max-h-[10rem] w-full max-w-xs border",
        serverConnected ? "border-primary/80 bg-muted/50" : "",
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          {MCP_CONFIG_ICONS[server.id]}
          <CardTitle className="text-primary/90 font-medium">{server.name}</CardTitle>
          {serverConnected && <div className="ml-2 h-2 w-2 rounded-full bg-green-500"></div>}
        </div>
        <CardDescription className="w-[90%]">{server.summary}</CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={serverConnected ? "default" : "secondary"}
            onMouseDown={handleConnectClick}
            disabled={isConnecting}
            className={cn(
              "border hover:cursor-pointer",
              serverConnected ? "bg-primary hover:bg-primary" : "bg-secondary/80 hover:bg-secondary/90",
            )}
          >
            {serverConnected ? "Disconnect" : "Connect"}
          </Button>

          <MCPDialog
            server={server}
            onSaveConfig={handleSaveConfig}
            savedConfig={currentConfig}
            open={isConfigDialogOpen}
            onOpenChange={setIsConfigDialogOpen}
          />

          {serverConnected && <ToolsPopover tools={tools} />}
        </div>
      </CardFooter>
    </Card>
  )
}
