"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface FileListUIProps {
  files: string[]
}

export function FileListUI({ files }: FileListUIProps) {
  const pathname = usePathname()

  return (
    <div className="bg-card w-[200px] border p-2">
      <ul className="divide-border divide-y">
        {files.map((file) => {
          const filePath = `/files/${file}`
          const isActive = pathname === filePath
          return (
            <li key={file}>
              <Link href={filePath} className={isActive ? "font-bold" : undefined}>
                {file}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
