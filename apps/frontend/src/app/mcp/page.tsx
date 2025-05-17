"use server"

import { MCPList } from "@/app/mcp/mcp-list"
import { asyncTryCatch } from "@dojo/utils"
import { Suspense } from "react"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

async function isMcpServiceHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.MCP_SERVICE_URL}/health`, {
      method: "GET",
      cache: "no-store",
    })
    return response.ok
  } catch (error) {
    console.error("MCP service health check failed:", error)
    return false
  }
}

async function Mcp() {
  const { data, error } = await asyncTryCatch(
    fetch(`${APP_URL}/api/mcp/servers`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }),
  )

  if (error || !data || !data.ok) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">Server is offline</p>
      </div>
    )
  }

  const servers = await data?.json()

  if (!servers.servers) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">No MCP servers available</p>
      </div>
    )
  }

  return <MCPList servers={servers.servers} />
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

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Mcp />
    </Suspense>
  )
}
