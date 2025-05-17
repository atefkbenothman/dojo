"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"

export function DarkModeToggle() {
  const { setTheme, theme } = useTheme()
  const { play } = useSoundEffect("./hover.mp3", {
    volume: 0.5,
  })

  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeClick = (theme: string) => {
    setTheme(theme)
    play()
  }

  return (
    <div>
      {mounted && (
        <Tabs defaultValue={theme ? theme : ""}>
          <TabsList>
            <TabsTrigger value="light" onMouseDown={() => handleThemeClick("light")} className="hover:cursor-pointer">
              <Sun />
            </TabsTrigger>
            <TabsTrigger value="dark" onMouseDown={() => handleThemeClick("dark")} className="hover:cursor-pointer">
              <Moon />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  )
}
