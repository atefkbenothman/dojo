"use client"

import { useState } from "react"
import { CircleCheck, Power, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    <div className="flex flex-row flex-wrap gap-8">
      {availableServers.map((server) => {
        const isConnected =
          connectionStatus === "connected" && connectedServerId === server.id

        return (
          <Card
            key={server.id}
            className={cn(
              "w-full max-w-xs",
              isConnected ? "border-primary border" : "",
            )}
          >
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-emerald-500" />
                    <h3 className="text-md font-medium">{server.name}</h3>
                  </div>
                  <div
                    className={`flex h-5 items-center gap-1 px-1.5 text-xs font-medium ${
                      isConnected
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {isConnected ? (
                      <CircleCheck className="h-2.5 w-2.5" />
                    ) : (
                      <X className="h-2.5 w-2.5" />
                    )}
                    {isConnected ? "Connected" : "Disconnected"}
                  </div>
                </div>

                <div className="bg-muted flex flex-col gap-1 p-1 text-xs">
                  <span className="text-muted-foreground text-xs">
                    Session ID
                  </span>
                  <span className="truncate font-mono text-sm">
                    {sessionId}
                  </span>
                </div>

                <div className="flex gap-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Settings className="mr-1 h-3 w-3" />
                        Config
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configure {server.name}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-3 py-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="api-key">API Key</Label>
                          <Input
                            id="api-key"
                            type="password"
                            placeholder="Enter your API key"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Save changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    className={`flex-1 text-xs ${
                      isConnected
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                    disabled={connectionStatus === "connecting"}
                    onClick={
                      isConnected
                        ? handleDisconnect
                        : () => handleConnect(server.id)
                    }
                  >
                    <Power className="mr-1 h-3 w-3" />
                    {connectionStatus === "connecting" &&
                    connectedServerId === server.id
                      ? "Connecting..."
                      : isConnected
                        ? "Disconnect"
                        : "Connect"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
