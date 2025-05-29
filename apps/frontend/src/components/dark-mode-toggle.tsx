"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div>
      {mounted && (
        <Tabs defaultValue={theme} className="h-9">
          <TabsList>
            <TabsTrigger value="light" onClick={() => setTheme("light")}>
              <Sun />
            </TabsTrigger>
            <TabsTrigger value="dark" onClick={() => setTheme("dark")}>
              <Moon />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  )
}
