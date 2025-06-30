"use client"

import { MCPDeleteDialog } from "@/components/mcp/mcp-delete-dialog"
import { MCPFormDialog } from "@/components/mcp/mcp-form-dialog"
import { MCPHeader } from "@/components/mcp/mcp-header"
import { MCPList } from "@/components/mcp/mcp-list"
import { MCPServerSettings } from "@/components/mcp/mcp-server-settings"
import { Button } from "@/components/ui/button"
import { useMCP, MCPConnectionState } from "@/hooks/use-mcp"
import { cn } from "@/lib/utils"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import type { MCPServer } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { PanelLeft, PanelRight } from "lucide-react"
import { useState, useCallback, useMemo } from "react"

export function Mcp() {
  const { isAuthenticated } = useConvexAuth()
  const { mcpServers, activeConnections, getConnection, connect, disconnect, remove, clone } = useMCP()

  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null)
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
  const [serverToDelete, setServerToDelete] = useState<MCPServer | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Create a map of connection statuses for efficient lookup
  const connectionStatuses = useMemo(() => {
    const statusMap = new Map<string, MCPConnectionState>()
    mcpServers.forEach((server) => {
      const conn = getConnection(server._id)
      if (conn) {
        statusMap.set(server._id, {
          status: conn.status as MCPConnectionState["status"],
          error: conn.error,
          isStale: conn.isStale,
        })
      }
    })
    return statusMap
  }, [mcpServers, getConnection])

  const handleEditServer = useCallback((server: MCPServer) => {
    setEditingServer(server)
    setDialogMode("edit")
    setIsDialogOpen(true)
  }, [])

  const handleDeleteServer = useCallback((server: MCPServer) => {
    setServerToDelete(server)
  }, [])

  const confirmDeleteServer = useCallback(async () => {
    if (serverToDelete) {
      await remove(serverToDelete._id)
      // If the deleted server was selected, clear the selection
      if (selectedServer?._id === serverToDelete._id) {
        setSelectedServer(null)
      }
      setServerToDelete(null)
    }
  }, [remove, selectedServer, serverToDelete])

  const handleCreateServer = useCallback(() => {
    setEditingServer(null)
    setDialogMode("add")
    setIsDialogOpen(true)
  }, [])

  const handleSelectServer = useCallback(
    (server: MCPServer) => {
      // Toggle selection - if clicking the same server, unselect it
      setSelectedServer(selectedServer?._id === server._id ? null : server)
    },
    [selectedServer],
  )

  const handleConnect = useCallback(
    async (server: MCPServer) => {
      await connect([server._id as Id<"mcp">])
    },
    [connect],
  )

  const handleDisconnect = useCallback(
    async (server: MCPServer) => {
      await disconnect(server._id)
    },
    [disconnect],
  )

  const handleCloneServer = useCallback(
    async (server: MCPServer) => {
      await clone(server._id)
    },
    [clone],
  )

  return (
    <>
      <div className="flex h-full bg-background overflow-hidden">
        {/* Left Sidebar */}
        <div
          className={cn(
            "shrink-0 bg-card border-r-[1.5px] flex flex-col h-full",
            isSidebarCollapsed ? "w-[42px]" : "w-96",
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "border-b-[1.5px] flex-shrink-0 flex items-center h-[42px]",
              isSidebarCollapsed ? "justify-center" : "justify-between p-4",
            )}
          >
            {!isSidebarCollapsed && <p className="text-sm font-semibold">MCP Servers</p>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn("hover:cursor-pointer", !isSidebarCollapsed && "ml-auto")}
            >
              {isSidebarCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </div>
          {/* Server List */}
          <MCPList
            servers={mcpServers}
            selectedServerId={selectedServer?._id || null}
            isAuthenticated={isAuthenticated}
            activeConnections={activeConnections}
            connectionStatuses={connectionStatuses}
            onSelectServer={handleSelectServer}
            onCreateServer={handleCreateServer}
            onEditServer={handleEditServer}
            onDeleteServer={handleDeleteServer}
            onCloneServer={handleCloneServer}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            isCollapsed={isSidebarCollapsed}
            onExpandSidebar={() => setIsSidebarCollapsed(false)}
          />
        </div>
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-x-auto">
          {selectedServer ? (
            <>
              <MCPHeader
                server={selectedServer}
                connectionStatus={connectionStatuses.get(selectedServer._id)}
                isAuthenticated={isAuthenticated}
                onEdit={() => handleEditServer(selectedServer)}
                onConnect={() => handleConnect(selectedServer)}
                onDisconnect={() => handleDisconnect(selectedServer)}
                onClone={() => handleCloneServer(selectedServer)}
              />
              {/* Content area - Settings */}
              <MCPServerSettings
                server={selectedServer}
                isAuthenticated={isAuthenticated}
                connectionStatus={connectionStatuses.get(selectedServer._id)}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select a server</p>
            </div>
          )}
        </div>
      </div>
      {/* Dialog for Add/Edit */}
      <MCPFormDialog
        mode={dialogMode}
        server={editingServer || undefined}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingServer(null)
          }
        }}
        isAuthenticated={isAuthenticated}
      />
      {/* Delete Confirmation Dialog */}
      <MCPDeleteDialog
        server={serverToDelete}
        open={!!serverToDelete}
        onOpenChange={(open) => !open && setServerToDelete(null)}
        onConfirm={confirmDeleteServer}
      />
    </>
  )
}
