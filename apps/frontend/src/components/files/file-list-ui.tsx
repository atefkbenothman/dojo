"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface FileListUIProps {
  files: string[]
}

export function FileListUI({ files }: FileListUIProps) {
  const pathname = usePathname()

  return (
    <div className="w-[240px] p-2">
      {files.length === 0 ? (
        <p className="text-muted-foreground px-2 py-1 text-sm">No files found</p>
      ) : (
        <ul className="space-y-1">
          {files.map((file) => {
            const filePath = `/files/${file}`
            const isActive = pathname === filePath
            return (
              <li key={file} className="">
                <Link
                  href={filePath}
                  className={`block truncate px-2 py-1.5 text-sm ${
                    isActive
                      ? "bg-secondary text-secondary-foreground font-semibold"
                      : "hover:bg-secondary hover:text-secondary-foreground"
                  }`}
                >
                  {file}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
