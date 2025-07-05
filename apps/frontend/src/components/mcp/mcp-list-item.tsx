"use client"

import { MCPStatusIndicator } from "@/components/mcp/mcp-status-indicator"
import { ToolsPopover } from "@/components/mcp/tools-popover"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoadingAnimationInline } from "@/components/ui/loading-animation"
import { ActiveConnection, isMCPConnected, isMCPConnecting, MCPConnectionState } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import type { MCPServer } from "@dojo/db/convex/types"
import { Settings, Plug, Unplug, Key, Pencil, Trash, Copy } from "lucide-react"
import { useState, useCallback } from "react"

interface MCPListItemProps {
  server: MCPServer
  isAuthenticated: boolean
  onEditClick: (server: MCPServer) => void
  onDeleteClick: (server: MCPServer) => void
  onCloneClick: (server: MCPServer) => void
  isSelected?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  connection?: ActiveConnection | null
  status?: MCPConnectionState | null
}

export function MCPListItem({
  server,
  isAuthenticated,
  onEditClick,
  onDeleteClick,
  onCloneClick,
  isSelected,
  onConnect,
  onDisconnect,
  connection,
  status,
}: MCPListItemProps) {
  const { play } = useSoundEffectContext()

  const isConnected = isMCPConnected(status)
  const isConnecting = isMCPConnecting(status)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Get ring color based on database status
  const getRingColor = () => {
    if (!status || status.status === "disconnected") {
      return ""
    }

    switch (status.status) {
      case "connected":
        return status.isStale ? "ring-red-500/80" : "ring-green-500/80"
      case "connecting":
      case "disconnecting":
        return "ring-yellow-500/80"
      case "error":
        return "ring-red-500/80"
      default:
        return ""
    }
  }

  // Determine if user can edit/delete this server
  const canEdit = isAuthenticated && !server.isPublic
  const canDelete = isAuthenticated && !server.isPublic

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      play("./sounds/click.mp3", { volume: 0.5 })
    },
    [play],
  )

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDropdownOpen(false)
    onEditClick(server)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDropdownOpen(false)
    onDeleteClick(server)
  }

  const handleCloneClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDropdownOpen(false)
    onCloneClick(server)
  }

  const handleConnectionToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isConnected) {
      onDisconnect?.()
    } else {
      onConnect?.()
    }
  }

  // Get transport type abbreviation
  const getTransportAbbr = (type: string) => {
    switch (type) {
      case "stdio":
        return "STDIO"
      case "http":
        return "HTTP"
      case "sse":
        return "SSE"
      default:
        return type.toUpperCase()
    }
  }

  return (
    <Card
      className={cn(
        "w-full bg-background overflow-hidden p-2 hover:bg-background/50",
        // Show status ring when there's a status
        getRingColor() && `ring-1 ${getRingColor()}`,
        // Show primary ring when selected (original behavior)
        isSelected && "ring-1 ring-primary/80 bg-background/50",
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Header matching workflow card exactly */}
        <div className="p-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
          {/* Title with status */}
          <div className="min-w-0 flex-1 flex items-center gap-2">
            {/* {Icon && (
              <div className="shrink-0 text-primary/70 [&>svg]:h-3.5 [&>svg]:w-3.5">
                <Icon />
              </div>
            )} */}
            <p className={cn("text-sm font-medium truncate text-primary/70", isSelected && "text-primary")}>
              {server.name}
            </p>
            {isConnecting ? <LoadingAnimationInline /> : <MCPStatusIndicator status={status} />}
          </div>
          {/* Right Side */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-start sm:justify-end">
            {/* Tools Popover - show when connected */}
            {isConnected && connection?.tools && <ToolsPopover tools={connection.tools} />}
            {/* Settings */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8 hover:cursor-pointer">
                  <Settings className="h-2.5 w-2.5 text-foreground/90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={handleEditClick} className="cursor-pointer" disabled={!canEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCloneClick} className="cursor-pointer" disabled={!isAuthenticated}>
                  <Copy className="mr-2 h-4 w-4" />
                  Clone
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  disabled={!canDelete}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Connect/Disconnect or Clone button */}
            {server.isPublic && server.requiresUserKey && isAuthenticated && !isConnected ? (
              <Button
                variant="outline"
                size="icon"
                onClick={handleCloneClick}
                className="size-8 hover:cursor-pointer"
                title="Clone this server to add your API keys, then connect"
              >
                <Copy className="h-2.5 w-2.5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={handleConnectionToggle}
                disabled={
                  isConnected
                    ? false
                    : (!isAuthenticated && server.requiresUserKey) ||
                      isConnecting ||
                      (server.localOnly && process.env.NODE_ENV === "production")
                }
                className="size-8 hover:cursor-pointer"
                title={
                  isConnected
                    ? "Disconnect"
                    : !isAuthenticated && server.requiresUserKey
                      ? "Login required to use servers with API keys"
                      : "Connect"
                }
              >
                {isConnected ? <Unplug className="h-2.5 w-2.5" /> : <Plug className="h-2.5 w-2.5" />}
              </Button>
            )}
          </div>
        </div>
        {/* Badge Row */}
        <div className="px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            {server.transportType && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border">
                {getTransportAbbr(server.transportType)}
              </span>
            )}
            {server.localOnly && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border">
                LOCAL
              </span>
            )}
            {server.requiresUserKey && (
              <span className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border">
                <Key className="h-2.5 w-2.5" />
                KEY
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
