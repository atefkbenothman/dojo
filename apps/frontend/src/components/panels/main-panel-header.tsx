"use client"

import { DarkModeToggle } from "@/components/dark-mode-toggle"
import { GithubLinkButton } from "@/components/github-link-button"
import { SignIn } from "@/components/sign-in"
import { SoundToggle } from "@/components/sound-toggle"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

interface MainPanelHeaderProps {
  onChatPanelToggle: () => void
  isCollapsed: boolean
}

export function MainPanelHeader({ onChatPanelToggle }: MainPanelHeaderProps) {
  return (
    <div className="bg-card flex h-[42px] flex-shrink-0 items-center border-b-[1.5px] pr-2 pl-4">
      <p className="flex-1 pr-4 text-base font-semibold">Dojo</p>
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
