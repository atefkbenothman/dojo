"use client"

import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

export function GithubLinkButton() {
  return (
    <Button size="icon" variant="outline" className="hover:cursor-pointer" asChild>
      <a
        href="https://github.com/atefkbenothman/dojo"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
      >
        <Github className="h-4.5 w-4.5" />
      </a>
    </Button>
  )
}
