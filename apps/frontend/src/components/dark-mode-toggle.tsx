"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"

export function DarkModeToggle() {
  const { setTheme, theme } = useTheme()
  const { play } = useSoundEffectContext()

  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeClick = (theme: string) => {
    setTheme(theme)
    play("./click.mp3", { volume: 0.5 })
  }

  return (
    <div>
      {mounted && (
        <Tabs defaultValue={theme} className="border">
          <TabsList>
            <TabsTrigger value="light" onMouseDown={() => handleThemeClick("light")}>
              <Sun />
            </TabsTrigger>
            <TabsTrigger value="dark" onMouseDown={() => handleThemeClick("dark")}>
              <Moon />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  )
}
