import { NextResponse } from "next/server"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function POST(request: Request) {
  const { modelId, prompt } = await request.json()

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, modelId }),
      cache: "no-store",
    }),
  )

  if (error || !data) {
    console.error(`[MCP API] Image generation failed:`, error)
    return NextResponse.json(
      { error: `Image generation failed with err: ${error}` },
      { status: 503 },
    )
  }

  const images = await data.json()
  return NextResponse.json({ images })
}
