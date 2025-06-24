"use server"

import { DemoVideo } from "@/components/demo-video"
import { MCP_SERVER_ICONS } from "@/components/icons"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { ComponentType, SVGProps } from "react"

export default async function LandingPage() {
  const GitHubIcon = MCP_SERVER_ICONS.github as ComponentType<SVGProps<SVGSVGElement>> | null

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col">
          <p className="text-2xl font-bold">Dojo</p>
          <p className="text-sm text-muted-foreground">Build, Run, and Chain AI Agents</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/dashboard" className="w-full">
            <Button className="hover:cursor-pointer w-full" size="default">
              Start Building
            </Button>
          </Link>
          <DemoVideo />
          <Button className="hover:cursor-pointer w-full" size="default" variant="outline">
            <a
              href="https://github.com/atefkbenothman/dojo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className="flex items-center justify-center w-full gap-2 text-sm"
            >
              {GitHubIcon && <GitHubIcon className="w-4 h-4" />}
              Github
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
