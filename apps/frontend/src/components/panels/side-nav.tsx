"use client"

import { SettingsDialog } from "@/components/settings/settings-dialog"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useLayout } from "@/hooks/use-layout"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { House, Server, Bot, User, Layers } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useState } from "react"

const navigationItems = [
  {
    href: "/dashboard",
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
  {
    href: "/workflow",
    icon: Layers,
    label: "Workflow",
  },
] as const

export function SideNav() {
  const pathname = usePathname()
  const { play } = useSoundEffectContext()
  const { isMobile } = useLayout()

  const [userDialogOpen, setUserDialogOpen] = useState(false)

  const handleClick = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  return (
    <nav className={cn(
      "bg-card flex-shrink-0 border-border",
      // Desktop: Vertical sidebar
      !isMobile && "w-[42px] h-full flex-col border-r-[1.5px] hidden md:flex",
      // Mobile: Horizontal bar
      isMobile && "w-full h-[42px] flex-row border-b-[1.5px] md:hidden flex items-center"
    )}>
      {/* Logo/Brand - Desktop only */}
      {!isMobile && (
        <div className="bg-card flex h-[42px] flex-shrink-0 items-center justify-center border-b-[1.5px]">
          <Link href="/" className="hover:cursor-pointer" onMouseDown={handleClick}>
            <p className="text-base font-medium">⛩️</p>
          </Link>
        </div>
      )}

      <TooltipProvider>
        {/* Navigation Items */}
        <div className={cn(
          "flex gap-4 py-2",
          // Desktop: Vertical stack
          !isMobile && "flex-col flex-1",
          // Mobile: Horizontal row
          isMobile && "flex-row flex-1 px-2"
        )}>
          {navigationItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href)
            return (
              <div key={href} className={cn(
                "flex items-center justify-center",
                !isMobile && "w-full"
              )}>
                <Tooltip delayDuration={800}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      className={cn("text-primary/50 group-hover:text-primary", isActive && "text-primary")}
                      onMouseDown={handleClick}
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
                  <TooltipContent side={isMobile ? "bottom" : "right"}>{label}</TooltipContent>
                </Tooltip>
              </div>
            )
          })}
        </div>

        {/* User Dialog */}
        <div className={cn(
          "flex items-center py-2",
          // Desktop: Full width with top border
          !isMobile && "w-full border-t-[1.5px] justify-center",
          // Mobile: Right side with left border
          isMobile && "border-l-[1.5px] h-full px-2"
        )}>
          <div
            onClick={() => setUserDialogOpen(true)}
            onMouseDown={handleClick}
            className="group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border"
          >
            <div className="text-primary/70 group-hover:text-primary">
              <User className="h-5 w-5" />
            </div>
          </div>
          <SettingsDialog isOpen={userDialogOpen} setIsOpen={setUserDialogOpen} />
        </div>
      </TooltipProvider>
    </nav>
  )
}
