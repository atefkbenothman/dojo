import { asyncTryCatch } from "@dojo/utils"
import { NextResponse } from "next/server"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { userId, prompt, modelId, n, apiKey } = await request.json()

  if (!userId || typeof userId !== "string") {
    console.error("[Image API] Missing or invalid userId")
    return NextResponse.json({ error: "Missing or invalid userId" }, { status: 400 })
  }

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, prompt, modelId, n, apiKey }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[Image API] Image generation failed for user ${userId}:`, error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error during fetch"
    return NextResponse.json({ error: `Image generation failed: ${errorMessage}` }, { status: 503 })
  }

  if (!data.ok) {
    console.error(
      `[Image API] Backend image generation failed for user ${userId}. Status: ${data.status}. Error: ${error}`,
    )
    return NextResponse.json({ error: `Image generation failed with status ${data.status}` }, { status: data.status })
  }

  const images = await data.json()
  return NextResponse.json({ images })
}
