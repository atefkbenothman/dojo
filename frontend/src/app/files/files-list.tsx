"use server"

import { asyncTryCatch } from "@/lib/utils"
import { FileListUI } from "@/app/files/file-list-ui"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function FilesList() {
  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/files/list-files`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    }),
  )

  if (error || !data?.ok) {
    return (
      <div className="p-2 text-sm">
        <div className="bg-destructive/10 text-destructive rounded-md p-3">
          <p>Error: {error?.message || (data && data.statusText) || "Failed to fetch files"}</p>
        </div>
      </div>
    )
  }

  const json = await data.json()
  const files = (json.files as string[]) || []

  if (!files.length) return <p>No files found.</p>

  return (
    <div>
      <p className="text-md w-full border-b px-4 py-2 font-semibold">Files</p>
      <FileListUI files={files} />
    </div>
  )
}
