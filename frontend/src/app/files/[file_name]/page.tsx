"use server"

import { asyncTryCatch } from "@/lib/utils"
import FileContent from "@/app/files/[file_name]/file-content"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

interface FilePageProps {
  params: { file_name: string }
}

export default async function FilePage({ params }: FilePageProps) {
  const { file_name } = await params
  const file = decodeURIComponent(file_name)

  const { data, error } = await asyncTryCatch(
    fetch(`${MCP_SERVICE_URL}/files/file-content?path=${encodeURIComponent(file)}`, {
      method: "GET",
      headers: { Accept: "text/plain" },
      cache: "no-store",
    }),
  )

  if (error || !data.ok) {
    return <p className="text-red-500">Error: {error?.message || "Unknown error"}</p>
  }

  const content = await data.text()

  return (
    <div className="bg-card h-full border p-2">
      <FileContent file={file} initialContent={content} />
    </div>
  )
}
