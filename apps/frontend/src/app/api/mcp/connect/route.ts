import { env } from "@/env"
import { asyncTryCatch } from "@dojo/utils"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { userId, server } = await request.json()

  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return NextResponse.json({ error: "Missing or invalid userId" }, { status: 400 })
  }
  if (!server || typeof server.id !== "string" || !server.config) {
    return NextResponse.json({ error: "Missing or invalid server object" }, { status: 400 })
  }

  console.log(`[MCP API] Connecting to server '${server.name}' (${server.id}) with user ID: ${userId}`)

  const { data, error } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, server }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[MCP API] Connection failed for user ${userId} to server '${server.id}':`, error)
    return NextResponse.json({ userId: undefined, error: "Failed to connect to MCP server" }, { status: 503 })
  }

  const response = await data.json()

  if (data.ok) {
    console.log(`[MCP API] Successfully connected user ${userId} to server '${server.id}'`)
    return NextResponse.json({ userId, serverId: server.id, tools: response.tools })
  }

  console.error(`[MCP API] Connection failed for user ${userId} to server '${server.id}': ${response.message}`)
  return NextResponse.json({ userId, error: response.message }, { status: data.status })
}
