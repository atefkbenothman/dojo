"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

interface LayoutContextType {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

interface LayoutProviderProps {
  children: ReactNode
}

// Breakpoint constants to match Tailwind
const MOBILE_BREAKPOINT = 768 // md breakpoint
const TABLET_BREAKPOINT = 1024 // lg breakpoint

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth
    }
    return 1024 // Default to desktop for SSR
  })

  // Calculate breakpoint states
  const isMobile = windowWidth < MOBILE_BREAKPOINT
  const isTablet = windowWidth >= MOBILE_BREAKPOINT && windowWidth < TABLET_BREAKPOINT
  const isDesktop = windowWidth >= TABLET_BREAKPOINT

  const handleResize = () => {
    setWindowWidth(window.innerWidth)
  }

  useEffect(() => {
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const value: LayoutContextType = {
    isMobile,
    isTablet,
    isDesktop,
  }

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout(): LayoutContextType {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider")
  }
  return context
}
