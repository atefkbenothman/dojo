import { asyncTryCatch } from "@dojo/utils"
import { NextResponse } from "next/server"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { userId, serverId } = await request.json()

  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    console.log("[MCP API] No userId provided for disconnect")
    return NextResponse.json({ success: false, error: "Missing or invalid userId" }, { status: 400 })
  }

  if (!serverId || typeof serverId !== "string" || serverId.trim() === "") {
    console.log("[MCP API] No serverId provided for disconnect")
    return NextResponse.json({ success: false, error: "Missing or invalid serverId" }, { status: 400 })
  }

  console.log(`[MCP API] Disconnecting user ${userId} from server ${serverId}`)

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, serverId }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[MCP API] Disconnect failed for user ${userId} from server ${serverId}:`, error)
    return NextResponse.json({ success: false, error: "Disconnect failed" }, { status: 503 })
  }

  console.log(`[MCP API] Successfully disconnected user ${userId} from server ${serverId}`)
  return NextResponse.json({ success: true })
}
