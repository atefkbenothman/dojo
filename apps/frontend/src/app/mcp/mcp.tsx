"use client"

import { AddMCPCard } from "@/components/mcp/add-mcp-card"
import { MCPCard } from "@/components/mcp/mcp-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMCP } from "@/hooks/use-mcp"
import type { MCPServer } from "@dojo/db/convex/types"
import { useConvexAuth } from "convex/react"
import { useEffect, useState } from "react"

export function Mcp() {
  const { isAuthenticated } = useConvexAuth()
  const { mcpServers, activeConnections, disconnectAll } = useMCP()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredServers, setFilteredServers] = useState<MCPServer[]>(mcpServers)

  useEffect(() => {
    const filtered =
      searchInput === ""
        ? mcpServers
        : mcpServers.filter((server) => server.name.toLowerCase().includes(searchInput.toLowerCase()))
    setFilteredServers(filtered)
  }, [searchInput, mcpServers])

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-4 sticky top-0 z-30 bg-background">
        {/* Heading */}
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">MCP Servers</p>
          <p className="text-xs text-muted-foreground">manage and connect to MCP servers</p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Input
            placeholder="Search"
            className="ring-none bg-input/30 h-10 resize-none border-border focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border w-[16rem] text-xs"
            onChange={(e) => setSearchInput(e.target.value)}
            value={searchInput}
          />
          <Button
            variant="outline"
            className="hover:cursor-pointer h-10"
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
          />
        ))}
      </div>
    </div>
  )
}
