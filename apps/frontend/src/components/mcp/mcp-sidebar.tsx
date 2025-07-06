"use client"

import { MCPList } from "@/components/mcp/mcp-list"
import { Button } from "@/components/ui/button"
import type { MCPConnectionState } from "@/hooks/use-mcp"
import { useSidebar } from "@/hooks/use-sidebar"
import { cn } from "@/lib/utils"
import type { MCPServer, MCPToolsCollection } from "@dojo/db/convex/types"
import { PanelLeft, PanelRight } from "lucide-react"

interface MCPSidebarProps {
  servers: MCPServer[]
  selectedServerId: string | null
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
  const { isCollapsed, toggleSidebar, expandSidebar } = useSidebar()

  return (
    <div className={cn("shrink-0 bg-card border-r-[1.5px] flex flex-col h-full", isCollapsed ? "w-[42px]" : "w-96")}>
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
          onClick={toggleSidebar}
          className={cn("hover:cursor-pointer", !isCollapsed && "ml-auto")}
        >
          {isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </div>
      {/* Server List */}
      <MCPList
        servers={servers}
        selectedServerId={selectedServerId}
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
        onExpandSidebar={expandSidebar}
      />
    </div>
  )
}
