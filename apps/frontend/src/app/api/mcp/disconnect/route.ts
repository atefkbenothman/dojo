import { NextResponse } from "next/server"
import { asyncTryCatch } from "@dojo/shared-utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { sessionId, serverId } = await request.json()

  if (!sessionId) {
    console.log("[MCP API] No sessionId provided for disconnect")
    return NextResponse.json({ success: false, error: "Missing sessionId" }, { status: 400 })
  }

  if (!serverId) {
    console.log("[MCP API] No serverId provided for disconnect")
    return NextResponse.json({ success: false, error: "Missing serverId" }, { status: 400 })
  }

  console.log(`[MCP API] Disconnecting session ${sessionId} from server ${serverId}`)

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, serverId }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[MCP API] Disconnect failed for session ${sessionId} from server ${serverId}:`, error)
    return NextResponse.json({ success: false, error: "Disconnect failed" }, { status: 503 })
  }

  console.log(`[MCP API] Successfully disconnected session ${sessionId} from server ${serverId}`)
  return NextResponse.json({ success: true })
}
