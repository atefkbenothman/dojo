"use server"

import FileContent from "@/app/files/file-content"
import { asyncTryCatch } from "@dojo/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

interface FilePageProps {
  params: Promise<{ file_name: string }>
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
    <div className="flex h-full w-full flex-col">
      <p className="text-md w-full border-b px-4 py-2 font-semibold">{file}</p>
      <div className="h-full flex-1 overflow-auto">
        <FileContent file={file} initialContent={content} />
      </div>
    </div>
  )
}
