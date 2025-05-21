"use client"

import { Button } from "@/components/ui/button"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { Github } from "lucide-react"

export function GithubLinkButton() {
  const { play } = useSoundEffect("./hover.mp3", {
    volume: 0.5,
  })

  const handleClick = () => {
    play()
  }

  return (
    <Button size="icon" variant="outline" className="hover:cursor-pointer" onMouseDown={handleClick} asChild>
      <a
        href="https://github.com/atefkbenothman/dojo"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
      >
        <Github className="h-4.5 w-4.5" />
      </a>
    </Button>
  )
}
