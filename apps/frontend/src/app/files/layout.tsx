"use server"

import { FilesList } from "@/app/files/files-list"
import React, { Suspense } from "react"

export default async function FilesLayout({ children }: { children: React.ReactNode }) {
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
