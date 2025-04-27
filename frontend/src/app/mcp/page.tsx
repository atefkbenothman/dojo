"use server"

import { Suspense } from "react"
import { MCPList } from "@/app/mcp/mcp-list"
import { asyncTryCatch } from "@/lib/utils"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export async function Mcp() {
  const { data, error } = await asyncTryCatch(
    fetch(`${APP_URL}/api/mcp/servers`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }),
  )

  if (error || !data) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">
          Connect to server first
        </p>
      </div>
    )
  }

  const { servers } = await data.json()

  return <MCPList servers={servers} />
}

export default async function McpPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Mcp />
    </Suspense>
  )
}
