"use client"

import { DarkModeToggle } from "@/components/dark-mode-toggle"
import { GithubLinkButton } from "@/components/github-link-button"
import { SignIn } from "@/components/sign-in"
import { SoundToggle } from "@/components/sound-toggle"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface MainPanelHeaderProps {
  onChatPanelToggle: () => void
  isCollapsed: boolean
}

export function MainPanelHeader({ onChatPanelToggle, isCollapsed }: MainPanelHeaderProps) {
  return (
    <div className="bg-card flex h-12 flex-shrink-0 items-center border-b pr-2 pl-4">
      <p className="flex-1 pr-4 text-base font-medium">Dojo</p>
      <div className="flex flex-row items-center gap-2">
        <SignIn />
        <DarkModeToggle />
        <GithubLinkButton />
        <SoundToggle />
        <Button onClick={onChatPanelToggle} size="icon" variant="outline" className="hover:cursor-pointer">
          {isCollapsed ? <ChevronLeft className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
        </Button>
      </div>
    </div>
  )
}
