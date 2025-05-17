import { asyncTryCatch } from "@dojo/utils"
import { NextResponse } from "next/server"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function GET() {
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
    return NextResponse.json({ error: "Failed to get available servers" }, { status: 503 })
  }

  const servers = await data.json()
  return NextResponse.json({ servers: servers.servers })
}
