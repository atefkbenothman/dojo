"use server"

import { MCPServers } from "@/lib/types"
import { MCPCard } from "./mcp-card"

interface MCPListProps {
  servers: MCPServers
}

export async function MCPList({ servers }: MCPListProps) {
  return (
    <div className="flex flex-row flex-wrap gap-4">
      {Object.entries(servers).map(([key, server]) => (
        <MCPCard key={key} server={server} />
      ))}
    </div>
  )
}
