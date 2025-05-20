"use client"

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { House, Server, FileText, Bot } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigationItems = [
  {
    href: "/",
    icon: House,
    label: "Home",
  },
  {
    href: "/agent",
    icon: Bot,
    label: "Agent",
  },
  {
    href: "/mcp",
    icon: Server,
    label: "MCP",
  },
  // {
  //   href: "/files",
  //   icon: FileText,
  //   label: "Files",
  // },
] as const

export function SideNav() {
  const pathname = usePathname()
  const { play } = useSoundEffect("./hover.mp3", {
    volume: 0.5,
  })

  return (
    <div className="bg-card w-[42px] flex-shrink-0 border-r">
      <div className="bg-card flex h-12 flex-shrink-0 items-center justify-center border-b">
        <p className="text-base font-medium">⛩️</p>
      </div>
      <div className="flex h-full flex-col gap-4 py-4">
        {navigationItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === href : pathname.startsWith(href)
          return (
            <div key={href} className="flex w-full items-center justify-center">
              <TooltipProvider>
                <Tooltip delayDuration={800}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      onMouseDown={() => play()}
                      className={cn("text-primary/50 group-hover:text-primary", isActive && "text-primary")}
                    >
                      <div
                        className={cn(
                          "group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border",
                          isActive && "bg-muted border-border border",
                        )}
                      >
                        <Icon className="h-5.5 w-5.5" />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )
        })}
      </div>
    </div>
  )
}
