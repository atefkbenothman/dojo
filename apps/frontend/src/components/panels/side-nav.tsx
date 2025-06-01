"use client"

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { UserDialog } from "@/components/user-dialog"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { House, Server, Bot, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const navigationItems = [
  {
    href: "/",
    icon: House,
    label: "Home",
  },
  {
    href: "/mcp",
    icon: Server,
    label: "MCP",
  },
  {
    href: "/agent",
    icon: Bot,
    label: "Agent",
  },
  // {
  //   href: "/files",
  //   icon: FileText,
  //   label: "Files",
  // },
] as const

export function SideNav() {
  const pathname = usePathname()
  const { play } = useSoundEffectContext()

  const [userDialogOpen, setUserDialogOpen] = useState(false)

  return (
    <div className="bg-card w-[42px] flex-shrink-0 border-r h-full flex flex-col">
      <div className="bg-card flex h-12 flex-shrink-0 items-center justify-center border-b">
        <p className="text-base font-medium">⛩️</p>
      </div>
      <TooltipProvider>
        <div className="flex flex-col gap-4 py-4 flex-1">
          {navigationItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/" ? pathname === href : pathname.startsWith(href)
            return (
              <div key={href} className="flex w-full items-center justify-center">
                <Tooltip delayDuration={800}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
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
              </div>
            )
          })}
        </div>
        {/* User Dialog */}
        <div className="flex w-full items-center border-t justify-center py-4">
          <div
            onClick={() => setUserDialogOpen(true)}
            onMouseDown={() => play("./sounds/click.mp3", { volume: 0.5 })}
            className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
          >
            <div className="text-primary/70 group-hover:text-primary">
              <User className="h-5 w-5" />
            </div>
          </div>
          <UserDialog isOpen={userDialogOpen} setIsOpen={setUserDialogOpen} />
        </div>
      </TooltipProvider>
    </div>
  )
}
