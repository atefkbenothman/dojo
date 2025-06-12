"use client"

import { useUser } from "@/hooks/use-user"
import { useEffect } from "react"

export function SessionInitializer({ children }: { children: React.ReactNode }) {
  const { initializeSession, isSessionReady, isInitializing, isAuthLoading } = useUser()

  useEffect(() => {
    // Initialize session when auth loading completes
    if (!isAuthLoading && !isSessionReady && !isInitializing) {
      initializeSession()
    }
  }, [isAuthLoading, isSessionReady, isInitializing, initializeSession])

  return <>{children}</>
}
