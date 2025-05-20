import { NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8888"

export async function GET() {
  const res = await fetch(`${BACKEND_URL}/config`, { cache: "no-store" })
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch config from backend" }, { status: 500 })
  }
  const data = await res.json()
  return NextResponse.json(data)
}
