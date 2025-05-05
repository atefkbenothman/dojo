import { NextResponse } from "next/server"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { messages, sessionId, modelId } = await request.json()

  console.log(
    `[API Route] Forwarding to mcp-service. Session: ${sessionId}, Model: ${modelId}, Messages: ${messages.length}`,
  )

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        sessionId,
        modelId,
      }),
    }),
  )

  if (!data?.body || error) {
    console.error(`[API Route] mcp-service responded with error: ${error}`)
    return NextResponse.json(
      {
        error: `Backend service failed: ${error}`,
      },
      {
        status: 503,
      },
    )
  }

  return new Response(data.body, {
    status: data.status,
    statusText: data.statusText,
    headers: {
      "Content-Type": data.headers.get("Content-Type") || "text/plain; charset=utf-8",
      "Transfer-Encoding": data.headers.get("Transfer-Encoding") || "chunked",
    },
  })
}
