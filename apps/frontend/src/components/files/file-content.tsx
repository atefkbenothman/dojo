"use client"

import { env } from "@/env"
import { useEffect, useState, useCallback } from "react"

interface FileContentClientProps {
  file: string
  initialContent: string
}

export default function FileContent({ file, initialContent }: FileContentClientProps) {
  const [content, setContent] = useState<string>(initialContent)
  const [loading, setLoading] = useState<boolean>(!initialContent)

  const fetchContent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${env.BACKEND_URL}/files/file-content?path=${encodeURIComponent(file)}`, {
        method: "GET",
        headers: { Accept: "text/plain" },
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`Failed to fetch file content: ${res.status}`)
      const text = await res.text()
      setContent(text)
    } finally {
      setLoading(false)
    }
  }, [file])

  useEffect(() => {
    if (!initialContent) {
      fetchContent()
    }
  }, [file, initialContent, fetchContent])

  useEffect(() => {
    const eventSource = new EventSource(`/api/files/events?path=${encodeURIComponent(file)}`)
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.event === "fileBatchChanged" && Array.isArray(data.changes)) {
          const relevant = data.changes.some((change: { path: string }) => change.path === file)
          if (relevant) {
            fetchContent()
          }
        }
      } catch (e) {
        console.warn(e)
      }
    }
    return () => {
      eventSource.close()
    }
  }, [file, fetchContent])

  if (loading) return <p>Loading...</p>

  return <FileContentDisplay content={content} />
}

function FileContentDisplay({ content }: { content: string }) {
  return (
    <div className="bg-background min-h-full p-4">
      <pre className="font-mono text-sm break-words whitespace-pre-wrap">{content}</pre>
    </div>
  )
}
