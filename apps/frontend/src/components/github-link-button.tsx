"use client"

import { MCP_SERVER_ICONS } from "@/components/icons"
import { Button } from "@/components/ui/button"
import type { ComponentType, SVGProps } from "react"

export function GithubLinkButton() {
  const GitHubIcon = MCP_SERVER_ICONS.github as ComponentType<SVGProps<SVGSVGElement>> | null

  return (
    <Button size="icon" variant="outline" className="hover:cursor-pointer" asChild>
      <a
        href="https://github.com/atefkbenothman/dojo"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
      >
        {GitHubIcon && <GitHubIcon className="h-4.5 w-4.5" />}
      </a>
    </Button>
  )
}
