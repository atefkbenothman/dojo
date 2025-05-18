import { asyncTryCatch } from "@dojo/utils"
import { NextResponse } from "next/server"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { userId, config } = await request.json()

  console.log(`[MCP API] Connecting to server '${config.name}' (${config.id}) with user ID: ${userId}`)

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, config }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[MCP API] Connection failed for user ${userId} to server '${config.id}':`, error)
    return NextResponse.json({ userId: undefined, error: "Failed to connect to MCP server" }, { status: 503 })
  }

  const response = await data.json()

  if (data.ok) {
    console.log(`[MCP API] Successfully connected user ${userId} to server '${config.id}'`)
    return NextResponse.json({ userId, serverId: config.id, tools: response.tools })
  }

  console.error(`[MCP API] Connection failed for user ${userId} to server '${config.id}': ${response.message}`)
  return NextResponse.json({ userId, error: response.message }, { status: data.status })
}
