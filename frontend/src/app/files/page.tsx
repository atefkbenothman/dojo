"use server"

import { Suspense } from "react"
import Link from "next/link"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

export async function Files() {
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

  return (
    <ul>
      {files.map((file) => (
        <li key={file}>
          <Link href={`/files/${encodeURIComponent(file)}`}>{file}</Link>
        </li>
      ))}
    </ul>
  )
}

export default async function FilesPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Files />
    </Suspense>
  )
}
