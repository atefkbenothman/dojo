"use client"

import { useEffect, useState, useRef } from "react"
import { MCPServers } from "@/lib/types"
import { MCPCard } from "./mcp-card"
import { Input } from "@/components/ui/input"

interface MCPListProps {
  servers: MCPServers
}

export function MCPList({ servers }: MCPListProps) {
  const [filteredServers, setFilteredServers] = useState<MCPServers>(servers)
  const [searchInput, setSearchInput] = useState<string>("")

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput === "") {
        setFilteredServers(servers)
      } else {
        const filtered = Object.entries(servers).filter(([, server]) =>
          server.name.toLowerCase().startsWith(searchInput.toLowerCase()),
        )
        setFilteredServers(Object.fromEntries(filtered))
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, servers])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value)
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search..."
        className="ring-none bg-input h-10 w-[16rem] resize-none border focus-visible:ring-transparent sm:text-[16px] md:text-xs"
        onChange={handleInputChange}
      />
      <div className="flex flex-row flex-wrap gap-4">
        {Object.entries(filteredServers).map(([key, server]) => (
          <MCPCard key={key} server={server} />
        ))}
      </div>
    </div>
  )
}
