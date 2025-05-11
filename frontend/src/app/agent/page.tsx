"use server"

import { Suspense } from "react"
import { AgentList } from "./agent-list"
import { AGENT_CONFIG } from "@/lib/config"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export async function Agents() {
  const agents = AGENT_CONFIG

  if (!agents || Object.keys(agents).length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">No agents available</p>
      </div>
    )
  }

  return <AgentList agents={agents} />
}

export default async function AgentPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Agents />
    </Suspense>
  )
}
