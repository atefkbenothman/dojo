"use client"

import { AddMCPCard } from "@/components/mcp/add-mcp-card"
import { MCPList } from "@/components/mcp/mcp-list"
import { Input } from "@/components/ui/input"
import { useMCPContext } from "@/hooks/use-mcp"
import type { MCPServer } from "@dojo/config"
import { useEffect, useState } from "react"

export function Mcp() {
  const { allAvailableServers } = useMCPContext()

  const [searchInput, setSearchInput] = useState<string>("")
  const [filteredServers, setFilteredServers] = useState<Record<string, MCPServer>>({})

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Input
          placeholder="Search..."
          className="ring-none bg-input h-10 resize-none border focus-visible:ring-transparent w-[16rem] text-xs"
          onChange={(e) => setSearchInput(e.target.value)}
          value={searchInput}
        />
      </div>
      <div className="flex flex-row flex-wrap gap-4">
        <AddMCPCard />
        <MCPList servers={filteredServers} />
      </div>
    </div>
  )
}
