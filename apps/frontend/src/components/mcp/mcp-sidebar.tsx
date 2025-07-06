"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PanelLeft, PanelRight } from "lucide-react"
import { useState } from "react"
import { MCPList } from "./mcp-list"
import type { MCPServer, MCPToolsCollection } from "@dojo/db/convex/types"
import type { MCPConnectionState } from "@/hooks/use-mcp"

interface MCPSidebarProps {
  servers: MCPServer[]
  selectedServerId: string | null
  isAuthenticated: boolean
  activeConnections: Array<{ serverId: string; name: string; tools: MCPToolsCollection }>
  connectionStatuses: Map<string, MCPConnectionState>
  onSelectServer: (server: MCPServer) => void
  onCreateServer: () => void
  onEditServer: (server: MCPServer) => void
  onDeleteServer: (server: MCPServer) => void
  onCloneServer: (server: MCPServer) => void
  onConnect: (server: MCPServer) => void
  onDisconnect: (server: MCPServer) => void
}

export function MCPSidebar({
  servers,
  selectedServerId,
  isAuthenticated,
  activeConnections,
  connectionStatuses,
  onSelectServer,
  onCreateServer,
  onEditServer,
  onDeleteServer,
  onCloneServer,
  onConnect,
  onDisconnect,
}: MCPSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={cn(
        "shrink-0 bg-card border-r-[1.5px] flex flex-col h-full",
        isCollapsed ? "w-[42px]" : "w-96",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "border-b-[1.5px] flex-shrink-0 flex items-center h-[42px]",
          isCollapsed ? "justify-center" : "justify-between p-4",
        )}
      >
        {!isCollapsed && <p className="text-sm font-semibold">MCP Servers</p>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("hover:cursor-pointer", !isCollapsed && "ml-auto")}
        >
          {isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </div>
      {/* Server List */}
      <MCPList
        servers={servers}
        selectedServerId={selectedServerId}
        isAuthenticated={isAuthenticated}
        activeConnections={activeConnections}
        connectionStatuses={connectionStatuses}
        onSelectServer={onSelectServer}
        onCreateServer={onCreateServer}
        onEditServer={onEditServer}
        onDeleteServer={onDeleteServer}
        onCloneServer={onCloneServer}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        isCollapsed={isCollapsed}
        onExpandSidebar={() => setIsCollapsed(false)}
      />
    </div>
  )
}