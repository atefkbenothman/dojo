"use client"

import { MCP_SERVER_ICONS } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { MCPServer } from "@dojo/db/convex/types"
import { Settings, Plug, Unplug, Key, Pencil, Trash } from "lucide-react"
import { useState } from "react"

interface MCPServerCardProps {
  server: MCPServer
  isAuthenticated: boolean
  onEditClick: (server: MCPServer) => void
  onDeleteClick: (server: MCPServer) => void
  isSelected: boolean
  onConnect: () => void
  onDisconnect: () => void
  connection?: { serverId: string; name: string; tools: Record<any, any> }
  status?: { status: string; error?: string; isStale?: boolean }
}

export function MCPServerCard({
  server,
  isAuthenticated,
  onEditClick,
  onDeleteClick,
  isSelected,
  onConnect,
  onDisconnect,
  connection,
  status,
}: MCPServerCardProps) {
  const isConnected = status?.status === "connected" && !status?.isStale
  const isConnecting = status?.status === "connecting"
  const hasError = status?.status === "error" || status?.isStale
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const Icon = MCP_SERVER_ICONS[server.name.toLowerCase()] || null

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger selection when clicking buttons or dropdown
    if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) {
      e.stopPropagation()
    }
  }

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

  const handleConnectionToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isConnected) {
      onDisconnect()
    } else {
      onConnect()
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
        // Only show ring when selected
        isSelected && "ring-1 ring-primary/80 bg-background/50",
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Header matching workflow card exactly */}
        <div className="p-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
          {/* Title with status */}
          <div className="min-w-0 flex-1 flex items-center gap-2">
            {Icon && (
              <div className="shrink-0 text-primary/70 [&>svg]:h-3.5 [&>svg]:w-3.5">
                <Icon />
              </div>
            )}
            <p className={cn("text-xs font-medium truncate text-primary/70", isSelected && "text-primary")}>
              {server.name}
            </p>
            {isConnected && <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />}
            {isConnecting && <div className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />}
            {hasError && <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />}
          </div>
          {/* Right Side */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-start sm:justify-end">
            {/* Settings */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8 hover:cursor-pointer">
                  <Settings className="h-2.5 w-2.5 text-foreground/90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={handleEditClick} className="cursor-pointer">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Connect/Disconnect button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleConnectionToggle}
              disabled={!isAuthenticated || isConnecting || (server.localOnly && process.env.NODE_ENV === "production")}
              className="size-8 hover:cursor-pointer"
              title={isConnected ? "Disconnect" : "Connect"}
            >
              {isConnected ? <Unplug className="h-2.5 w-2.5" /> : <Plug className="h-2.5 w-2.5" />}
            </Button>
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
