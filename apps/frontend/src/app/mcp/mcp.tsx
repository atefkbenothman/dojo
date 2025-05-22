"use client"

import { AddMCPCard } from "@/app/mcp/add-mcp"
import { MCPList } from "@/app/mcp/mcp-list"
import { Input } from "@/components/ui/input"
import { useMCPContext } from "@/hooks/use-mcp"
import type { MCPServer } from "@dojo/config"
import { useEffect, useState } from "react"

export function Mcp() {
  const { mcpServers, isServerHealthy } = useMCPContext()

  const [filteredServers, setFilteredServers] = useState<Record<string, MCPServer>>({})
  const [searchInput, setSearchInput] = useState<string>("")
  const [customServers, setCustomServers] = useState<Record<string, MCPServer>>({})

  useEffect(() => {
    const allAvailableServers = { ...mcpServers, ...customServers }
    if (searchInput === "") {
      setFilteredServers(allAvailableServers)
    } else {
      const filtered = Object.entries(allAvailableServers).filter(([, server]) =>
        server.name.toLowerCase().startsWith(searchInput.toLowerCase()),
      )
      setFilteredServers(Object.fromEntries(filtered))
    }
  }, [searchInput, mcpServers, customServers, isServerHealthy])

  const handleAddServer = (newServer: MCPServer) => {
    setCustomServers((prev) => ({
      ...prev,
      [newServer.id]: newServer,
    }))
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Input
          placeholder="Search..."
          className="ring-none bg-input h-10 resize-none border focus-visible:ring-transparent w-[16rem] text-xs"
          onChange={handleInputChange}
          value={searchInput}
        />
      </div>
      <div className="flex flex-row flex-wrap gap-4">
        <AddMCPCard onAddServer={handleAddServer} />
        <MCPList servers={filteredServers} />
      </div>
    </div>
  )
}
