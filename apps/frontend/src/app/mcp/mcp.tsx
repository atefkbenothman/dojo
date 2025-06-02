"use client"

import { AddMCPCard } from "@/components/mcp/add-mcp-card"
import { MCPCard } from "@/components/mcp/mcp-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMCPContext } from "@/hooks/use-mcp"
import type { MCPServer } from "@dojo/config"
import { useEffect, useState } from "react"

export function Mcp() {
  const { allAvailableServers, hasActiveConnections, disconnectAll } = useMCPContext()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredServers, setFilteredServers] = useState<Record<string, MCPServer>>(allAvailableServers)

  useEffect(() => {
    const filtered =
      searchInput === ""
        ? allAvailableServers
        : Object.fromEntries(
            Object.entries(allAvailableServers).filter(([, server]) =>
              server.name.toLowerCase().startsWith(searchInput.toLowerCase()),
            ),
          )
    setFilteredServers(filtered)
  }, [searchInput, allAvailableServers])

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 border-b p-4 sticky top-0 z-30 bg-card">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">MCP Servers</p>
          <p className="text-xs text-muted-foreground">manage and connect to MCP servers</p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center border-b pb-4 md:border-0 md:pb-0 md:mx-0 md:px-0 -mx-4 px-4">
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
            disabled={!hasActiveConnections}
            title="Disconnect all"
          >
            Disconnect All
          </Button>
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-4 p-4">
        <AddMCPCard />
        {Object.entries(filteredServers).map(([key, server]) => (
          <MCPCard key={key} server={server} />
        ))}
      </div>
    </div>
  )
}
