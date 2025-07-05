"use client"

import { MCPContentArea } from "@/components/mcp/mcp-content-area"
import { MCPDeleteDialog } from "@/components/mcp/mcp-delete-dialog"
import { MCPFormDialog } from "@/components/mcp/mcp-form-dialog"
import { MCPHeader } from "@/components/mcp/mcp-header"
import { MCPList } from "@/components/mcp/mcp-list"
import { Button } from "@/components/ui/button"
import { useMCP, MCPConnectionState } from "@/hooks/use-mcp"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { successToastStyle } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import type { MCPServer } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { PanelLeft, PanelRight } from "lucide-react"
import { useState, useCallback, useMemo, useEffect } from "react"
import { toast } from "sonner"

export function Mcp() {
  const { mcpServers, activeConnections, getConnection, connect, disconnect, remove, clone, checkServerDependencies } =
    useMCP()
  const { isAuthenticated } = useConvexAuth()
  const { play } = useSoundEffectContext()
  const { selectedId: selectedServerId, setSelectedId: setSelectedServerId } = useUrlSelection()

  const [editingServerId, setEditingServerId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
  const [serverToDelete, setServerToDelete] = useState<MCPServer | null>(null)
  const [affectedAgents, setAffectedAgents] = useState<
    Array<{ id: string; name: string; isPublic?: boolean }> | undefined
  >()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Derive selected server from mcpServers array to ensure it's always up to date
  const selectedServer = useMemo(() => {
    if (!selectedServerId) return null
    return mcpServers.find((server) => server._id === selectedServerId) || null
  }, [mcpServers, selectedServerId])

  // Derive editing server from mcpServers array to ensure it's always up to date
  const editingServer = useMemo(() => {
    if (!editingServerId) return null
    return mcpServers.find((server) => server._id === editingServerId) || null
  }, [mcpServers, editingServerId])

  // Create a map of connection statuses for efficient lookup
  const connectionStatuses = useMemo(() => {
    const statusMap = new Map<string, MCPConnectionState>()
    mcpServers.forEach((server) => {
      const conn = getConnection(server._id)
      if (conn) {
        statusMap.set(server._id, {
          status: conn.status as MCPConnectionState["status"],
          error: conn.error,
          isStale: !!conn.isStale,
          statusUpdatedAt: conn.statusUpdatedAt,
        })
      }
    })
    return statusMap
  }, [mcpServers, getConnection])

  const handleEditServer = useCallback((server: MCPServer) => {
    setEditingServerId(server._id)
    setDialogMode("edit")
    setIsDialogOpen(true)
  }, [])

  const handleDeleteServer = useCallback(
    async (server: MCPServer) => {
      // Always check dependencies before showing dialog
      const deps = await checkServerDependencies(server._id)
      setAffectedAgents(deps?.agents || [])
      setServerToDelete(server)
    },
    [checkServerDependencies],
  )

  const confirmDeleteServer = useCallback(
    async (force?: boolean) => {
      if (serverToDelete) {
        try {
          await remove(serverToDelete._id, force)

          // Show success toast
          const actionText = force ? "Force deleted" : "Deleted"
          toast.success(`${actionText} ${serverToDelete.name} server`, {
            icon: null,
            duration: 3000,
            position: "bottom-center",
            style: successToastStyle,
          })
          play("./sounds/delete.mp3", { volume: 0.5 })

          // If the deleted server was selected, clear the selection
          if (selectedServerId === serverToDelete._id) {
            setSelectedServerId(null)
          }
          setServerToDelete(null)
          setAffectedAgents(undefined)
        } catch (error) {
          // If it's a dependency error and we haven't forced, the dialog should stay open
          // The checkDependencies should have already populated affectedAgents
          const errorMessage = error instanceof Error ? error.message : ""
          if (!force && errorMessage.includes("Cannot delete MCP server")) {
            // Dialog stays open, dependencies should already be shown
            return
          }
          // For other errors, close dialog and let the error toast show
          setServerToDelete(null)
          setAffectedAgents(undefined)
        }
      }
    },
    [remove, selectedServerId, serverToDelete, play],
  )

  const handleCreateServer = useCallback(() => {
    setEditingServerId(null)
    setDialogMode("add")
    setIsDialogOpen(true)
  }, [])

  const handleServerCreated = useCallback(
    (serverId: string) => {
      // Auto-select the newly created server
      setSelectedServerId(serverId)
    },
    [setSelectedServerId],
  )


  const handleSelectServer = useCallback(
    (server: MCPServer) => {
      // Toggle selection - if clicking the same server, unselect it
      setSelectedServerId(selectedServerId === server._id ? null : server._id)
    },
    [selectedServerId, setSelectedServerId],
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
        <div className="flex flex-col flex-1 overflow-x-hidden">
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
              <MCPContentArea
                server={selectedServer}
                connectionStatus={connectionStatuses.get(selectedServer._id)}
                isAuthenticated={isAuthenticated}
                onDeleteClick={handleDeleteServer}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                {selectedServerId && Array.isArray(mcpServers) 
                  ? "Server does not exist" 
                  : "Select a server"
                }
              </p>
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
            setEditingServerId(null)
          }
        }}
        isAuthenticated={isAuthenticated}
        onServerCreated={handleServerCreated}
      />
      {/* Delete Confirmation Dialog */}
      <MCPDeleteDialog
        server={serverToDelete}
        open={!!serverToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setServerToDelete(null)
            setAffectedAgents(undefined)
          }
        }}
        onConfirm={confirmDeleteServer}
        affectedAgents={affectedAgents}
      />
    </>
  )
}
