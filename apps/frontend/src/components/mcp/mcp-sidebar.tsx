"use client"

import { MCPServerCard } from "@/components/mcp/mcp-server-card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { MCPServer, MCPToolsCollection } from "@dojo/db/convex/types"
import { Search, Plus, Plug, Globe, Server } from "lucide-react"
import { useState, memo, useMemo, useCallback } from "react"

interface MCPSidebarProps {
  servers: MCPServer[]
  selectedServerId: string | null
  isAuthenticated: boolean
  activeConnections: Array<{ serverId: string; name: string; tools: MCPToolsCollection }>
  connectionStatuses: Map<string, { status: string; error?: string; isStale?: boolean }>
  onSelectServer: (server: MCPServer) => void
  onCreateServer: () => void
  onEditServer: (server: MCPServer) => void
  onDeleteServer: (server: MCPServer) => void
  onCloneServer: (server: MCPServer) => void
  onConnect: (serverId: string) => void
  onDisconnect: (serverId: string) => void
  isCollapsed: boolean
  onExpandSidebar: () => void
}

export const MCPSidebar = memo(function MCPSidebar({
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
  isCollapsed,
  onExpandSidebar,
}: MCPSidebarProps) {
  const [searchInput, setSearchInput] = useState<string>("")
  const [openSections, setOpenSections] = useState<string[]>([])
  const { play } = useSoundEffectContext()

  const handleClick = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  // Separate servers into connected, global (public) and user servers
  const { connectedServers, globalServers, userServers } = useMemo(() => {
    const connected: MCPServer[] = []
    const global: MCPServer[] = []
    const user: MCPServer[] = []

    servers.forEach((server) => {
      // Check if server is connected
      const isConnected = activeConnections.some((conn) => conn.serverId === server._id)

      if (isConnected) {
        connected.push(server)
      }

      if (server.isPublic) {
        global.push(server)
      } else {
        user.push(server)
      }
    })

    return { connectedServers: connected, globalServers: global, userServers: user }
  }, [servers, activeConnections])

  // Filter servers based on search
  const filterServers = (serverList: MCPServer[]) => {
    if (searchInput === "") return serverList
    return serverList.filter(
      (server) =>
        server.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        server.summary?.toLowerCase().includes(searchInput.toLowerCase()),
    )
  }

  const filteredConnectedServers = filterServers(connectedServers)
  const filteredGlobalServers = filterServers(globalServers)
  const filteredUserServers = filterServers(userServers)

  // Handlers for collapsed state
  const handleSearchClick = () => {
    onExpandSidebar()
    // Focus search input immediately
    requestAnimationFrame(() => {
      const searchInput = document.querySelector('input[placeholder="Search servers"]') as HTMLInputElement
      searchInput?.focus()
    })
  }

  const handleSectionClick = (section: string) => {
    onExpandSidebar()
    setOpenSections([section])
  }

  const handleAddClick = () => {
    onExpandSidebar()
    onCreateServer()
  }

  return (
    <div className="flex flex-col bg-card flex-1 min-h-0 overflow-y-auto no-scrollbar relative">
      {isCollapsed ? (
        // Collapsed state
        <div className="flex flex-col gap-4 py-2">
          {/* Search */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={handleSearchClick}
              onMouseDown={handleClick}
              className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Add */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={!isAuthenticated ? undefined : handleAddClick}
              onMouseDown={!isAuthenticated ? undefined : handleClick}
              className={cn(
                "group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border",
                !isAuthenticated && "opacity-50 cursor-not-allowed pointer-events-none",
              )}
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Plus className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="w-full border-t-[1.5px]" />

          {/* Connected */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={() => handleSectionClick("connected")}
              onMouseDown={handleClick}
              className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Plug className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Global */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={() => handleSectionClick("global")}
              onMouseDown={handleClick}
              className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Globe className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* My Servers */}
          <div className="flex w-full items-center justify-center">
            <div
              onClick={() => handleSectionClick("user")}
              onMouseDown={handleClick}
              className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
            >
              <div className="text-primary/70 group-hover:text-primary">
                <Server className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Expanded state
        <>
          {/* Search */}
          <div className="sticky top-0 z-50 bg-card">
            <div className="relative w-full p-4 border-b-[1.5px]">
              <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
              <Input
                placeholder="Search servers"
                className="h-9 pl-9 text-xs bg-background/50 focus-visible:ring-0"
                onChange={(e) => setSearchInput(e.target.value)}
                value={searchInput}
              />
            </div>
            {/* Create */}
            <div className="p-4 border-b-[1.5px]">
              <Button
                variant="outline"
                className="w-full h-10 hover:cursor-pointer"
                onClick={onCreateServer}
                disabled={!isAuthenticated}
                title={!isAuthenticated ? "Authentication required to create MCP servers" : undefined}
              >
                {isAuthenticated ? "Add MCP Server" : "Sign in to add servers"}
              </Button>
            </div>
          </div>
          {/* Server List with Accordion Sections */}
          <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="w-full">
            {/* Connected Servers Section */}
            <AccordionItem value="connected">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card z-10">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Connected</span>
                  <span className="text-xs text-muted-foreground">({filteredConnectedServers.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 py-4">
                <div className="flex flex-col gap-4">
                  {filteredConnectedServers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      {searchInput ? "No connected servers match your search" : "No servers are currently connected"}
                    </p>
                  ) : (
                    filteredConnectedServers.map((server) => {
                      const connection = activeConnections.find((conn) => conn.serverId === server._id)
                      const status = connectionStatuses.get(server._id)
                      return (
                        <div key={server._id} className="cursor-pointer" onClick={() => onSelectServer(server)}>
                          <MCPServerCard
                            server={server}
                            isAuthenticated={isAuthenticated}
                            onEditClick={onEditServer}
                            onDeleteClick={onDeleteServer}
                            onCloneClick={onCloneServer}
                            isSelected={selectedServerId === server._id}
                            onConnect={() => onConnect(server._id)}
                            onDisconnect={() => onDisconnect(server._id)}
                            connection={connection}
                            status={status}
                          />
                        </div>
                      )
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <div className="border-b-[1px]" />

            <AccordionItem value="global">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card z-10">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Public Servers</span>
                  <span className="text-xs text-muted-foreground">({filteredGlobalServers.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 py-4">
                <div className="flex flex-col gap-4">
                  {filteredGlobalServers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      {searchInput ? "No global servers match your search" : "No global servers available"}
                    </p>
                  ) : (
                    filteredGlobalServers.map((server) => {
                      const connection = activeConnections.find((conn) => conn.serverId === server._id)
                      const status = connectionStatuses.get(server._id)
                      return (
                        <div key={server._id} className="cursor-pointer" onClick={() => onSelectServer(server)}>
                          <MCPServerCard
                            server={server}
                            isAuthenticated={isAuthenticated}
                            onEditClick={onEditServer}
                            onDeleteClick={onDeleteServer}
                            onCloneClick={onCloneServer}
                            isSelected={selectedServerId === server._id}
                            onConnect={() => onConnect(server._id)}
                            onDisconnect={() => onDisconnect(server._id)}
                            connection={connection}
                            status={status}
                          />
                        </div>
                      )
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <div className="border-b-[1px]" />

            {/* User Servers Section - Always shown */}
            <AccordionItem value="user" className="">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card z-10 border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">My Servers</span>
                  {isAuthenticated && (
                    <span className="text-xs text-muted-foreground">({filteredUserServers.length})</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 py-4">
                <div className="flex flex-col gap-4">
                  {!isAuthenticated ? (
                    <p className="text-xs text-muted-foreground py-2">Sign in to create your own servers</p>
                  ) : filteredUserServers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {searchInput ? "No personal servers match your search" : "You haven't created any servers yet"}
                    </p>
                  ) : (
                    filteredUserServers.map((server) => {
                      const connection = activeConnections.find((conn) => conn.serverId === server._id)
                      const status = connectionStatuses.get(server._id)
                      return (
                        <div key={server._id} className="cursor-pointer" onClick={() => onSelectServer(server)}>
                          <MCPServerCard
                            server={server}
                            isAuthenticated={isAuthenticated}
                            onEditClick={onEditServer}
                            onDeleteClick={onDeleteServer}
                            onCloneClick={onCloneServer}
                            isSelected={selectedServerId === server._id}
                            onConnect={() => onConnect(server._id)}
                            onDisconnect={() => onDisconnect(server._id)}
                            connection={connection}
                            status={status}
                          />
                        </div>
                      )
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <div className="border-b-[1px]" />
          </Accordion>
        </>
      )}
    </div>
  )
})
