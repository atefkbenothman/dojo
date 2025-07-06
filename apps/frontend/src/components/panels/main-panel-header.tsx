"use client"

import { DarkModeToggle } from "@/components/dark-mode-toggle"
import { GithubLinkButton } from "@/components/github-link-button"
import { SignIn } from "@/components/sign-in"
import { SoundToggle } from "@/components/sound-toggle"
import { Button } from "@/components/ui/button"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { MessageSquare } from "lucide-react"
import Link from "next/link"
import { useCallback } from "react"

interface MainPanelHeaderProps {
  onChatPanelToggle: () => void
  hasUnreadMessages: boolean
}

export function MainPanelHeader({ onChatPanelToggle, hasUnreadMessages }: MainPanelHeaderProps) {
  const { play } = useSoundEffectContext()

  const handleLogoClick = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  return (
    <div className="bg-card flex h-[42px] flex-shrink-0 items-center border-b-[1.5px] pr-2">
      <div className="flex items-center flex-1 pr-4">
        {/* Logo - only show on mobile, with same styling as sidenav */}
        <Link href="/" className="hover:cursor-pointer block md:hidden" onMouseDown={handleLogoClick}>
          <div className="flex-shrink-0 border-r-[1.5px] h-[42px] flex items-center justify-center w-[42px] p-4">
            <p className="text-base font-medium">⛩️</p>
          </div>
        </Link>
        <p className="text-base font-semibold pl-4">Dojo</p>
      </div>
      <div className="flex flex-row items-center gap-2">
        <SignIn />
        <GithubLinkButton />
        <DarkModeToggle />
        <SoundToggle />
        <Button onClick={onChatPanelToggle} size="icon" variant="outline" className="relative hover:cursor-pointer">
          <MessageSquare className="h-4.5 w-4.5" />
          {hasUnreadMessages && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
