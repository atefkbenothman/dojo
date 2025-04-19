"use client"

import { CircleCheck, Copy, Power, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AvailableServersInfo, useChatProvider } from "@/hooks/use-chat"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { MCPServerConfig } from "@/lib/types"

interface MCPDialogProps {
  server: MCPServerConfig
}

function MCPDialog({ server }: MCPDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="ml-auto hover:cursor-pointer"
        >
          <Settings className="h-4.5 w-4.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {server.displayName}</DialogTitle>
          <DialogDescription>{server.summary}</DialogDescription>
        </DialogHeader>
        {server.userArgs && (
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2 px-0.5">
              <Label htmlFor="link" className="text-primary/90 font-normal">
                Arguments
              </Label>
              <Input />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface MCPCardProps {
  server: MCPServerConfig
  isConnected: boolean
  connectionStatus: string
  connectedServerId: string | null
  sessionId: string | null
  userArgs: string
  setUserArgs: (args: string) => void
  handleConnectWithArgs: (serverId: string) => Promise<void>
  handleDisconnect: () => void
}

function MCPCard({
  server,
  isConnected,
  connectionStatus,
  connectedServerId,
  sessionId,
  userArgs,
  setUserArgs,
  handleConnectWithArgs,
  handleDisconnect,
}: MCPCardProps) {
  return (
    <Card
      className={cn(
        "h-[10rem] max-h-[10rem] w-full max-w-xs",
        isConnected && "border-primary border",
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="font-semibold">{server.displayName}</CardTitle>
          {isConnected && (
            <div className="ml-2 h-2 w-2 rounded-full bg-green-500"></div>
          )}
        </div>
        <CardDescription>{server.summary}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto">
        <Button
          variant={isConnected ? "default" : "secondary"}
          onClick={
            isConnected
              ? handleDisconnect
              : () => handleConnectWithArgs(server.id)
          }
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
        <MCPDialog server={server} />
      </CardFooter>
    </Card>
  )
}

interface MCPListProps {
  servers: AvailableServersInfo
}

export function MCPList({ servers }: MCPListProps) {
  const {
    connectionStatus,
    handleConnect,
    handleDisconnect,
    sessionId,
    connectedServerId,
  } = useChatProvider()

  const [userArgs, setUserArgs] = useState("/Users/kai/dev/sandbox")

  const handleConnectWithArgs = async (serverId: string) => {
    console.log("Connecting to server:", serverId)
    await handleConnect(serverId, [userArgs])
  }

  return (
    <div className="flex flex-row flex-wrap gap-4">
      {Object.entries(servers).map(([key, server]) => {
        const isConnected =
          connectionStatus === "connected" && connectedServerId === key
        return (
          <MCPCard
            key={key}
            server={server}
            isConnected={isConnected}
            connectionStatus={connectionStatus}
            connectedServerId={connectedServerId}
            sessionId={sessionId}
            userArgs={userArgs}
            setUserArgs={setUserArgs}
            handleConnectWithArgs={handleConnectWithArgs}
            handleDisconnect={handleDisconnect}
          />
        )
      })}
    </div>
  )
}
