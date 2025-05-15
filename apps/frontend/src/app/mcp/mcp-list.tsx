"use client"

import { useEffect, useState } from "react"
import { MCPServers, MCPServerConfig, Server } from "@/lib/types"
import { MCPCard } from "./mcp-card"
import { AddMCPDialog } from "./add-mcp-dialog"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusIcon } from "lucide-react"
import { MCP_CONFIG } from "@/lib/config"

interface MCPListProps {
  servers: MCPServers
}

export function MCPList({ servers }: MCPListProps) {
  const [filteredServers, setFilteredServers] = useState<MCPServers>(servers)
  const [searchInput, setSearchInput] = useState<string>("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [customServers, setCustomServers] = useState<MCPServers>({})

  useEffect(() => {
    const timer = setTimeout(() => {
      const allServers = { ...servers, ...customServers }
      if (searchInput === "") {
        setFilteredServers(allServers)
      } else {
        const filtered = Object.entries(allServers).filter(([, server]) =>
          server.name.toLowerCase().startsWith(searchInput.toLowerCase()),
        )
        setFilteredServers(Object.fromEntries(filtered))
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, servers, customServers])

  const handleAddServer = (newServer: Server, config: MCPServerConfig) => {
    setCustomServers((prev) => ({
      ...prev,
      [newServer.id]: newServer,
    }))
    MCP_CONFIG[newServer.id] = config
  }

  function AddMCPCard() {
    return (
      <Card
        className="hover:border-primary/80 hover:bg-muted/50 relative h-[10rem] max-h-[10rem] w-full max-w-xs cursor-pointer border transition-colors"
        onClick={() => setIsAddDialogOpen(true)}
      >
        <CardHeader className="flex h-full items-center justify-center">
          <CardTitle className="text-primary/90 flex items-center font-medium">
            <PlusIcon className="mr-2 h-5 w-5" />
            Add New Server
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

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
        <AddMCPCard />
        {Object.entries(filteredServers).map(([key, server]) => (
          <MCPCard key={key} server={server} />
        ))}
      </div>

      <AddMCPDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddServer={handleAddServer} />
    </div>
  )
}
