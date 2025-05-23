import { env } from "@/env"
import { asyncTryCatch } from "@dojo/utils"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const relativePath = searchParams.get("path")

  if (!relativePath) {
    return NextResponse.json({ error: "Missing 'path' query parameter" }, { status: 400 })
  }

  console.log(`[API Route /file-content] Fetching path: ${relativePath}`)

  const backendUrl = new URL(`${env.BACKEND_URL}/files/file-events`)
  backendUrl.searchParams.append("path", relativePath)

  const { data, error } = await asyncTryCatch(
    fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
    }),
  )

  if (!data?.body || error) {
    console.error(`[API Route] Failed to connect to backend SSE:`, error)
    return NextResponse.json({ error: "Backend SSE service unavailable" }, { status: 503 })
  }

  return new Response(data.body, {
    status: data.status,
    statusText: data.statusText,
    headers: {
      "Content-Type": data.headers.get("Content-Type") || "text/event-stream; charset=utf-8",
      "Cache-Control": data.headers.get("Cache-Control") || "no-cache",
      Connection: data.headers.get("Connection") || "keep-alive",
    },
  })
}
