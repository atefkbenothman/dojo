"use client"

import { MCPDeleteDialog } from "@/components/mcp/mcp-delete-dialog"
import { MCPDialog } from "@/components/mcp/mcp-dialog"
import { MCPServerSettings } from "@/components/mcp/mcp-server-settings"
import { MCPSidebar } from "@/components/mcp/mcp-sidebar"
import { Button } from "@/components/ui/button"
import { useMCP } from "@/hooks/use-mcp"
import { cn } from "@/lib/utils"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import type { MCPServer } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { Pencil, Plug, Unplug, Copy, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useCallback, useMemo } from "react"

export function Mcp() {
  const { isAuthenticated } = useConvexAuth()
  const { mcpServers, activeConnections, getConnection, connect, disconnect, create, edit, remove, clone } = useMCP()

  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null)
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
  const [serverToDelete, setServerToDelete] = useState<MCPServer | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Create a map of connection statuses for efficient lookup
  const connectionStatuses = useMemo(() => {
    const statusMap = new Map<string, { status: string; error?: string; isStale?: boolean }>()
    mcpServers.forEach((server) => {
      const conn = getConnection(server._id)
      if (conn) {
        statusMap.set(server._id, {
          status: conn.status,
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
    async (serverId: string) => {
      await connect([serverId as Id<"mcp">])
    },
    [connect],
  )

  const handleDisconnect = useCallback(
    async (serverId: string) => {
      await disconnect(serverId)
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
      <div className="flex h-full bg-background">
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
              "border-b-[1.5px] flex-shrink-0 flex items-center h-16",
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
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          {/* Server List */}
          <MCPSidebar
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
        <div className="flex flex-col flex-1">
          {selectedServer ? (
            <>
              {/* Header */}
              <div className="p-4 border-b-[1.5px] flex-shrink-0 flex items-center justify-between w-full bg-card h-16">
                {/* Left section - Name and Edit */}
                <div className="flex items-center gap-2 flex-1">
                  <p className="text-sm font-semibold max-w-[160px] truncate">{selectedServer.name}</p>
                  {/* Connection status dot */}
                  {(() => {
                    const status = connectionStatuses.get(selectedServer._id)
                    const isConnected = status?.status === "connected" && !status?.isStale
                    const isConnecting = status?.status === "connecting"
                    const hasError = status?.status === "error" || status?.isStale

                    if (isConnected) return <div className="h-2 w-2 rounded-full bg-green-500" />
                    if (isConnecting) return <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    if (hasError) return <div className="h-2 w-2 rounded-full bg-red-500" />
                    return null
                  })()}
                  {/* Edit */}
                  {!selectedServer.isPublic && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditServer(selectedServer)}
                      className="hover:cursor-pointer"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>

                {/* Right section - Connect/Disconnect or Clone button */}
                <div className="flex items-center justify-end flex-1">
                  {(() => {
                    const status = connectionStatuses.get(selectedServer._id)
                    const isConnected = status?.status === "connected" && !status?.isStale
                    const isConnecting = status?.status === "connecting"
                    const disableConnect =
                      (selectedServer.localOnly && process.env.NODE_ENV === "production") ||
                      (!isAuthenticated && selectedServer.requiresUserKey)

                    // Show clone button for public servers requiring keys (when authenticated and not connected)
                    if (selectedServer.isPublic && selectedServer.requiresUserKey && isAuthenticated && !isConnected) {
                      return (
                        <Button
                          className="border-[1px] hover:cursor-pointer bg-blue-700 hover:bg-blue-800 text-white border-blue-500 hover:border-blue-800"
                          onClick={() => handleCloneServer(selectedServer)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Clone to Configure
                        </Button>
                      )
                    }

                    return (
                      <Button
                        className={cn(
                          "border-[1px] hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                          isConnected
                            ? "bg-red-700 hover:bg-red-800 text-white border-red-500 hover:border-red-800 disabled:hover:bg-red-700"
                            : "bg-green-700 hover:bg-green-800 text-white border-green-500 hover:border-green-800 disabled:hover:bg-green-700",
                        )}
                        onClick={() =>
                          isConnected ? handleDisconnect(selectedServer._id) : handleConnect(selectedServer._id)
                        }
                        disabled={isConnecting || disableConnect}
                        title={
                          disableConnect && !isAuthenticated && selectedServer.requiresUserKey
                            ? "Login required to use servers with API keys"
                            : undefined
                        }
                      >
                        {isConnected ? (
                          <>
                            <Unplug className="h-3 w-3 mr-1" />
                            Disconnect
                          </>
                        ) : (
                          <>
                            <Plug className="h-3 w-3 mr-1" />
                            Connect
                          </>
                        )}
                      </Button>
                    )
                  })()}
                </div>
              </div>

              {/* Content area - Settings */}
              <MCPServerSettings
                server={selectedServer}
                isAuthenticated={isAuthenticated}
                connectionStatus={connectionStatuses.get(selectedServer._id)}
                activeConnection={activeConnections.find((conn) => conn.serverId === selectedServer._id)}
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
      <MCPDialog
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
