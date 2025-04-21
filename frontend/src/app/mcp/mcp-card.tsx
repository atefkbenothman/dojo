"use client"

import { useState } from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { MCPServerConfig, Server } from "@/lib/types"
import { MCPDialog } from "./mcp-dialog"
import { MCP_CONFIG } from "@/lib/config"
import { useChatProvider } from "@/hooks/use-chat"

interface MCPCardProps {
  server: Server
}

export function MCPCard({ server }: MCPCardProps) {
  const {
    connectionStatus,
    handleConnect,
    handleDisconnect,
    connectedServerId,
  } = useChatProvider()

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

  const isConnected =
    connectionStatus === "connected" && connectedServerId === server.id

  const handleConnectClick = async () => {
    if (isConnected) {
      handleDisconnect()
    } else if (currentConfig) {
      try {
        await handleConnect(currentConfig)
      } catch (error) {
        console.error("Failed to connect:", error)
      }
    }
  }

  const handleConfigureClick = () => {
    setIsConfigDialogOpen(true)
  }

  const handleSaveConfig = (config: MCPServerConfig) => {
    setCurrentConfig(config)
  }

  return (
    <Card
      className={cn(
        "relative h-[10rem] max-h-[10rem] w-full max-w-xs",
        isConnected && "border",
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-primary/90 font-medium">
            {server.name}
          </CardTitle>
          {isConnected && (
            <div className="ml-2 h-2 w-2 rounded-full bg-green-500"></div>
          )}
        </div>
        <CardDescription className="w-[90%]">{server.summary}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isConnected ? "default" : "secondary"}
            onClick={handleConnectClick}
            disabled={connectionStatus === "connecting"}
            className={cn(
              "border hover:cursor-pointer",
              isConnected
                ? "bg-primary hover:bg-primary"
                : "bg-secondary/80 hover:bg-secondary/90",
            )}
          >
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
          <MCPDialog
            server={server}
            onSaveConfig={handleSaveConfig}
            savedConfig={currentConfig}
            open={isConfigDialogOpen}
            onOpenChange={setIsConfigDialogOpen}
          />
        </div>
      </CardFooter>
    </Card>
  )
}
