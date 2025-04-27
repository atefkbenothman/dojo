import { NextResponse } from "next/server"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { sessionId } = await request.json()

  if (!sessionId) {
    console.log("[MCP API] No sessionId provided for disconnect")
    return NextResponse.json({ success: false }, { status: 400 })
  }

  console.log(`[MCP API] Disconnecting session ${sessionId}`)

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(
      `[MCP API] Disconnect failed for session ${sessionId}:`,
      error,
    )
    return NextResponse.json(
      { success: false, error: "Disconnect failed" },
      { status: 503 },
    )
  }

  console.log(`[MCP API] Successfully disconnected session ${sessionId}`)
  return NextResponse.json({ success: true })
}
