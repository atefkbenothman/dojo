import { asyncTryCatch } from "@dojo/shared-utils"
import { NextResponse } from "next/server"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { sessionId } = await request.json()

  if (!sessionId || typeof sessionId !== "string") {
    console.error("[Agent Stop API] Missing or invalid sessionId")
    return NextResponse.json({ success: false, error: "Missing or invalid sessionId" }, { status: 400 })
  }

  console.log(`[Agent Stop API] Stopping agent connections for session ID: ${sessionId}`)

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/agent/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[Agent Stop API] Agent stop call failed for session ${sessionId}:`, error)
    return NextResponse.json({ success: false, error: "Failed to call agent stop service" }, { status: 503 })
  }

  const response = await data.json()

  if (data.ok) {
    console.log(`[Agent Stop API] Successfully stopped agent connections for session ${sessionId}`)
    return NextResponse.json(response)
  }

  console.error(
    `[Agent Stop API] Agent stop call failed for session ${sessionId} - Backend response: ${response.message || "Unknown error"}`,
  )
  return NextResponse.json({ success: false, error: response.message || "Agent stop failed" }, { status: data.status })
}
