import { NextResponse } from "next/server"
import { asyncTryCatch } from "@dojo/shared-utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function GET() {
  console.log(`[MCP API] Checking health of MCP service at ${MCP_SERVICE_URL}/health`)

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error("[MCP API] Health check failed:", error)
    return NextResponse.json({ success: false, error: "Service unavailable" }, { status: 503 })
  }

  const health = await data.json()
  return NextResponse.json({ success: health.status === "ok" })
}
