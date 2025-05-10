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

  if (error || !data.ok) {
    return <p>Error: {error?.message || "Failed to fetch files"}</p>
  }

  const json = await data.json()
  const files = (json.files as string[]) || []

  if (!files.length) return <p>No files found.</p>

  return <FileListUI files={files} />
}
