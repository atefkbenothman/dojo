"use client"

import { DarkModeToggle } from "@/components/dark-mode-toggle"
import { GithubLinkButton } from "@/components/github-link-button"
import { SignIn } from "@/components/sign-in"
import { SoundToggle } from "@/components/sound-toggle"
import { Button } from "@/components/ui/button"
import { useLayout } from "@/hooks/use-layout"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { MessageSquare } from "lucide-react"
import Link from "next/link"
import { useCallback } from "react"

interface MainPanelHeaderProps {
  onChatPanelToggle: () => void
}

export function MainPanelHeader({ onChatPanelToggle }: MainPanelHeaderProps) {
  const { play } = useSoundEffectContext()
  const { isMobile } = useLayout()

  const handleLogoClick = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
  }, [play])

  return (
    <div className="bg-card flex h-[42px] flex-shrink-0 items-center border-b-[1.5px] pr-2">
      <div className="flex items-center flex-1 pr-4">
        {/* Logo - only show on mobile, with same styling as sidenav */}
        {isMobile && (
          <Link href="/" className="hover:cursor-pointer" onMouseDown={handleLogoClick}>
            <div className="flex-shrink-0 border-r-[1.5px] w-[42px] p-4">
              <p className="text-base font-medium">⛩️</p>
            </div>
          </Link>
        )}
        <p className="text-base font-semibold pl-4">Dojo</p>
      </div>
      <div className="flex flex-row items-center gap-2">
        <SignIn />
        <GithubLinkButton />
        <DarkModeToggle />
        <SoundToggle />
        <Button onClick={onChatPanelToggle} size="icon" variant="outline" className="hover:cursor-pointer">
          <MessageSquare className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  )
}
