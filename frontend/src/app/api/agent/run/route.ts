import { NextResponse } from "next/server"
import { v4 as uuid4 } from "uuid"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { sessionId: currentSessionId, config } = await request.json()
  let sessionId = currentSessionId || uuid4()

  console.log(`[Agent API] Running agent '${config.name}' (${config.id}) with session ID: ${sessionId}`)

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/agent/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, config }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[Agent API] Agent run failed for session ${sessionId} for agent '${config.id}':`, error)
    return NextResponse.json({ error: "Failed to run agent" }, { status: 503 })
  }

  const response = await data.json()

  if (data.ok) {
    console.log(`[Agent API] Successfully ran agent '${config.id}' for session ${sessionId}`)
    return NextResponse.json(response)
  }

  console.error(`[Agent API] Agent run failed for session ${sessionId} for agent '${config.id}': ${response.message}`)
  return NextResponse.json({ error: response.message }, { status: data.status })
}
