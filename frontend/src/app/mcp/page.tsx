"use server"

import { Suspense } from "react"
import { MCPList } from "@/app/mcp/mcp-list"
import { getAvailableMCPServers } from "@/actions/mcp-client-actions"

export async function Mcp() {
  const { servers, error } = await getAvailableMCPServers()

  if (error || !servers) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">
          Connect to server first
        </p>
      </div>
    )
  }

  return <MCPList servers={servers} />
}

export default async function McpPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Mcp />
    </Suspense>
  )
}
