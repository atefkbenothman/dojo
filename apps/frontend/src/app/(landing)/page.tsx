"use client"

import { DemoVideo } from "@/components/demo-video"
import { MCP_SERVER_ICONS } from "@/components/icons"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import type { ComponentType, SVGProps } from "react"

export default function LandingPage() {
  const router = useRouter()
  const GitHubIcon = MCP_SERVER_ICONS.github as ComponentType<SVGProps<SVGSVGElement>> | null

  // Prefetch all app routes immediately when landing page loads
  useEffect(() => {
    router.prefetch("/dashboard")
    router.prefetch("/mcp")
    router.prefetch("/agent")
    router.prefetch("/workflow")
  }, [router])

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="flex min-h-full flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col">
            <p className="text-2xl font-bold">Dojo</p>
            <p className="text-sm text-muted-foreground">Build, Run, and Chain AI Agents</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard" className="w-full" prefetch={true}>
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
    </div>
  )
}
