import { NextResponse } from "next/server"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { sessionId, config } = await request.json()

  console.log(`[MCP API] Connecting to server '${config.name}' (${config.id}) with session ID: ${sessionId}`)

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, config }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[MCP API] Connection failed for session ${sessionId} to server '${config.id}':`, error)
    return NextResponse.json({ sessionId: undefined, error: "Failed to connect to MCP server" }, { status: 503 })
  }

  const response = await data.json()

  if (data.ok) {
    console.log(`[MCP API] Successfully connected session ${sessionId} to server '${config.id}'`)
    return NextResponse.json({ sessionId, serverId: config.id, tools: response.tools })
  }

  console.error(`[MCP API] Connection failed for session ${sessionId} to server '${config.id}': ${response.message}`)
  return NextResponse.json({ sessionId, error: response.message }, { status: data.status })
}
