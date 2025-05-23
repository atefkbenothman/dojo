import { env } from "@/env"
import { NextResponse } from "next/server"

export async function GET() {
  const res = await fetch(`${env.BACKEND_URL}/config`, { cache: "no-store" })
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch config from backend" }, { status: 500 })
  }
  const data = await res.json()
  return NextResponse.json(data)
}
