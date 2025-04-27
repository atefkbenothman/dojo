import { NextResponse } from "next/server"
import { v4 as uuid4 } from "uuid"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { currentSessionId, config } = await request.json()
  let sessionId = currentSessionId || uuid4()

  console.log(
    `[MCP API] Connecting to server '${config.name}' with session ID: ${sessionId}`,
  )

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
    console.error(
      `[MCP API] Connection failed for session ${sessionId}:`,
      error,
    )
    return NextResponse.json({ sessionId: undefined }, { status: 503 })
  }

  const connection = await data.json()

  if (connection.message === "Already connected") {
    console.log(
      `[MCP API] Session ${sessionId} is already connected to server '${config.name}'`,
    )
  } else {
    console.log(
      `[MCP API] Successfully connected session ${sessionId} to server '${config.name}'`,
    )
  }

  return NextResponse.json({ sessionId })
}
