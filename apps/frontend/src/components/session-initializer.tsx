"use client"

import { useUser } from "@/hooks/use-user"
import { useEffect } from "react"

/**
 * Ensures all users (authenticated and guest) have sessions before app interaction
 */
export function SessionInitializer({ children }: { children: React.ReactNode }) {
  const { initializeSession, isSessionReady, isInitializing, isAuthLoading } = useUser()

  useEffect(() => {
    // Initialize session for first-time users
    if (!isAuthLoading && !isSessionReady && !isInitializing) {
      initializeSession()
    }
  }, [isAuthLoading, isSessionReady, isInitializing, initializeSession])

  return <>{children}</>
}
