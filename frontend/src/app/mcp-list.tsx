"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useChatProvider } from "@/hooks/use-chat"
import { cn } from "@/lib/utils"

export function MCPList() {
  const {
    connectionStatus,
    handleConnect,
    handleDisconnect,
    sessionId,
    availableServers,
    connectedServerId,
  } = useChatProvider()

  console.log("availableServers:", availableServers)
  console.log("Is Array?", Array.isArray(availableServers))
  console.log("Length:", availableServers?.length)

  if (
    !availableServers ||
    !Array.isArray(availableServers) ||
    availableServers.length === 0
  ) {
    return (
      <div className="flex h-full w-fit w-full items-center justify-center">
        <p className="border p-4">No servers available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-row flex-wrap gap-4">
      {availableServers.map((server) => {
        console.log("Rendering server:", server)
        const isConnected =
          connectionStatus === "connected" && connectedServerId === server.id

        return (
          <Card
            key={server.id}
            className={cn(
              "mb-4 w-[20rem]",
              isConnected ? "border-chart-1 border" : "",
            )}
          >
            <CardHeader>
              <CardTitle>{server.name}</CardTitle>
              <CardDescription>Online</CardDescription>
              <CardDescription>
                Status: {isConnected ? "connected" : connectionStatus}
              </CardDescription>
              {sessionId && isConnected && (
                <CardDescription>Session ID: {sessionId}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                onClick={
                  isConnected
                    ? handleDisconnect
                    : () => handleConnect(server.id)
                }
                disabled={connectionStatus === "connecting"}
                className="w-fit"
                variant={isConnected ? "destructive" : "default"}
              >
                {connectionStatus === "connecting" &&
                connectedServerId === server.id
                  ? "Connecting..."
                  : isConnected
                    ? "Disconnect"
                    : "Connect"}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
