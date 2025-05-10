"use server"

import React, { Suspense } from "react"
import { FilesList } from "@/app/files/files-list"

export default async function FilesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full">
      <div className="flex h-full w-full flex-row gap-4">
        <Suspense fallback={<p>Loading...</p>}>
          <FilesList />
        </Suspense>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
