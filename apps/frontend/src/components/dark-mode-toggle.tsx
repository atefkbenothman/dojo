"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setMounted(true)
  }, [])

  // Return skeleton with same dimensions to prevent layout shift
  if (!mounted) {
    return <div className="h-9 w-[72px] rounded-md bg-muted border" />
  }

  return (
    <Tabs defaultValue={theme} className="h-9 border">
      <TabsList>
        <TabsTrigger value="light" onClick={() => setTheme("light")}>
          <Sun />
        </TabsTrigger>
        <TabsTrigger value="dark" onClick={() => setTheme("dark")}>
          <Moon />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
