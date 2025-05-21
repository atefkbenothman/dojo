"use client"

import { AddMCPDialog } from "@/app/mcp/add-mcp-dialog"
import { MCPCard } from "@/app/mcp/mcp-card"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useConnectionContext } from "@/hooks/use-mcp"
import type { MCPServer } from "@dojo/config"
import { PlusIcon } from "lucide-react"
import { useEffect, useState } from "react"

export function AddMCPCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="hover:border-primary/80 hover:bg-muted/50 relative h-[10rem] max-h-[10rem] w-full max-w-xs cursor-pointer border transition-colors"
      onClick={onClick}
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

export function MCPList() {
  const { mcpServers, isServerHealthy } = useConnectionContext()

  const [filteredServers, setFilteredServers] = useState<Record<string, MCPServer>>({})
  const [searchInput, setSearchInput] = useState<string>("")
  const [customServers, setCustomServers] = useState<Record<string, MCPServer>>({})

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      const allServers = { ...mcpServers, ...customServers }
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
  }, [searchInput, customServers])

  const handleAddServer = (newServer: MCPServer) => {
    setCustomServers((prev) => ({
      ...prev,
      [newServer.id]: newServer,
    }))
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value)
  }

  if (!isServerHealthy) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">Server is offline</p>
      </div>
    )
  }

  if (Object.keys(mcpServers).length === 0 && Object.keys(customServers).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-10">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">No MCP servers available</p>
        <AddMCPCard onClick={() => setIsAddDialogOpen(true)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search..."
        className="ring-none bg-input h-10 w-[16rem] resize-none border focus-visible:ring-transparent sm:text-[16px] md:text-xs"
        onChange={handleInputChange}
      />
      <div className="flex flex-row flex-wrap gap-4">
        <AddMCPCard onClick={() => setIsAddDialogOpen(true)} />
        {Object.entries(filteredServers).map(([key, server]) => (
          <MCPCard key={key} server={server} />
        ))}
      </div>
      <AddMCPDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddServer={handleAddServer} />
    </div>
  )
}
