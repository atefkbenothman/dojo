import { env } from "@/env"
import { asyncTryCatch } from "@dojo/utils"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { userId } = await request.json()

  if (!userId || typeof userId !== "string") {
    console.error("[Agent Stop API] Missing or invalid userId")
    return NextResponse.json({ success: false, error: "Missing or invalid userId" }, { status: 400 })
  }

  console.log(`[Agent Stop API] Stopping agent connections for user ID: ${userId}`)

  const { data, error } = await asyncTryCatch(
    fetch(`${env.BACKEND_URL}/agent/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[Agent Stop API] Agent stop call failed for user ${userId}:`, error)
    return NextResponse.json({ success: false, error: "Failed to call agent stop service" }, { status: 503 })
  }

  const response = await data.json()

  if (data.ok) {
    console.log(`[Agent Stop API] Successfully stopped agent connections for user ${userId}`)
    return NextResponse.json(response)
  }

  console.error(
    `[Agent Stop API] Agent stop call failed for user ${userId} - Backend response: ${response.message || "Unknown error"}`,
  )
  return NextResponse.json({ success: false, error: response.message || "Agent stop failed" }, { status: data.status })
}
