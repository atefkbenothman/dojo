"use server"

import { MCPList } from "@/app/mcp/mcp-list"
import { asyncTryCatch } from "@dojo/utils"

async function isMcpServiceHealthy(): Promise<boolean> {
  const { data, error } = await asyncTryCatch(
    fetch(`${process.env.MCP_SERVICE_URL}/health`, {
      method: "GET",
      cache: "no-store",
    }),
  )
  if (error || !data) {
    console.error("MCP service health check failed:", error)
    return false
  }
  return data.ok
}

export default async function McpPage() {
  const isHealthy = await isMcpServiceHealthy()

  if (!isHealthy) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">Server is offline</p>
      </div>
    )
  }

  return <MCPList />
}
