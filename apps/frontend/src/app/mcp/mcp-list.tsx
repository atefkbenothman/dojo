"use client"

import { MCPCard } from "@/app/mcp/mcp-card"
import type { MCPServer } from "@dojo/config"

interface MCPListProps {
  servers: Record<string, MCPServer>
}

export function MCPList({ servers }: MCPListProps) {
  return (
    <>
      {Object.entries(servers).map(([key, server]) => (
        <MCPCard key={key} server={server} />
      ))}
    </>
  )
}
