"use client"

import { AddMCPCard } from "@/components/mcp/add-mcp-card"
import { MCPCard } from "@/components/mcp/mcp-card"
import { MCPDialog } from "@/components/mcp/mcp-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMCP } from "@/hooks/use-mcp"
import type { MCPServer } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { Search } from "lucide-react"
import { useEffect, useState } from "react"

export function Mcp() {
  const { isAuthenticated } = useConvexAuth()
  const { mcpServers, activeConnections, disconnectAll } = useMCP()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredServers, setFilteredServers] = useState<MCPServer[]>(mcpServers)
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const filtered =
      searchInput === ""
        ? mcpServers
        : mcpServers.filter((server) => server.name.toLowerCase().includes(searchInput.toLowerCase()))
    setFilteredServers(filtered)
  }, [searchInput, mcpServers])

  const handleEditServer = (server: MCPServer) => {
    setSelectedServer(server)
    setIsDialogOpen(true)
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-4 sticky top-0 z-30 bg-background">
        {/* Heading */}
        <div className="flex flex-col gap-1 border-b pb-4 -my-4 py-4 -mx-4 px-4">
          <p className="text-sm font-medium">MCP Servers</p>
          <p className="text-xs text-muted-foreground">manage and connect to MCP servers</p>
        </div>
        <div className="flex flex-row items-center gap-4 flex-nowrap border-b pb-4 -mx-4 px-4 py-4">
          <div className="relative min-w-0 flex-1 max-w-[24rem]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search"
              className="ring-none bg-input/30 h-10 resize-none border-border focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border pl-10 text-xs"
              onChange={(e) => setSearchInput(e.target.value)}
              value={searchInput}
            />
          </div>
          <Button
            variant="outline"
            className="hover:cursor-pointer h-10 whitespace-nowrap flex-shrink-0"
            onClick={disconnectAll}
            disabled={activeConnections.length === 0}
            title="Disconnect all"
          >
            Disconnect All
          </Button>
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-4 px-4 pb-4">
        <AddMCPCard disabled={!isAuthenticated} />
        {filteredServers.map((server) => (
          <MCPCard
            key={server._id}
            server={server}
            isProd={process.env.NODE_ENV === "production"}
            isAuthenticated={isAuthenticated}
            onEditClick={handleEditServer}
          />
        ))}
      </div>
      {/* Single dialog instance for all cards */}
      {selectedServer && (
        <MCPDialog
          mode="edit"
          server={selectedServer}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  )
}
