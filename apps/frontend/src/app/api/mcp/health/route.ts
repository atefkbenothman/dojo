import { env } from "@/env"
import { asyncTryCatch } from "@dojo/utils"
import { NextResponse } from "next/server"

export async function GET() {
  console.log(`[MCP API] Checking health of MCP service at ${env.BACKEND_URL}/health`)

  const { data, error } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error("[MCP API] Health check failed:", error)
    return NextResponse.json({ success: false, error: "Service unavailable" }, { status: 503 })
  }

  const health = await data.json()
  return NextResponse.json({ success: health.status === "ok" })
}
