"use server"

import { FilesList } from "@/app/files/files-list"
import { env } from "@/env"
import React, { Suspense } from "react"

async function isMcpServiceHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${env.BACKEND_URL}/health`, {
      method: "GET",
      cache: "no-store",
    })
    return response.ok
  } catch (error) {
    console.error("MCP service health check failed:", error)
    return false
  }
}

export default async function FilesLayout({ children }: { children: React.ReactNode }) {
  const isHealthy = await isMcpServiceHealthy()

  if (!isHealthy) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">Server is offline</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex h-full w-full flex-row gap-4">
        <aside className="bg-card h-full overflow-y-auto rounded-md border shadow-sm">
          <Suspense fallback={<p>Loading files...</p>}>
            <FilesList />
          </Suspense>
        </aside>
        <main className="bg-card flex-1 overflow-y-auto border">{children}</main>
      </div>
    </div>
  )
}
