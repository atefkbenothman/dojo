import { NextResponse } from "next/server"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function GET() {
  console.log(
    `[MCP API] Fetching available servers from ${MCP_SERVICE_URL}/servers`,
  )

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/servers`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error("[MCP API] Failed to get available servers:", error)
    return NextResponse.json(
      { error: "Failed to get available servers" },
      { status: 503 },
    )
  }

  const servers = await data.json()
  console.log(`[MCP API] Successfully fetched available servers`)
  return NextResponse.json({ servers: servers.servers })
}
