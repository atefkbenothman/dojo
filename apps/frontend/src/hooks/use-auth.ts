"use client"

import { useStableQuery } from "@/hooks/use-stable-query"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import { useConvexAuth } from "convex/react"
import { useEffect } from "react"

interface UseAuthReturn {
  user: Doc<"users"> | null | undefined
  userApiKeys: Doc<"apiKeys">[]
  isAuthenticated: boolean
  isAuthLoading: boolean
  signOut: () => Promise<void>
}

/**
 * Hook for authentication-related data and actions.
 * This is a lightweight hook that only deals with auth state, not sessions.
 */
export function useAuth(): UseAuthReturn {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const { signOut: convexSignOut } = useAuthActions()

  // User data - using stable query to prevent object reference instability
  const user = useStableQuery(api.user.currentUser)
  const userApiKeys = useStableQuery(api.apiKeys.getMyApiKeys, {}) || []

  // Auto sign out if authenticated but no user
  useEffect(() => {
    if (user === undefined) {
      return
    }
    if (isAuthenticated && user === null) {
      // Wrap in try-catch to handle potential errors
      convexSignOut().catch((error) => {
        console.error("Failed to sign out after user data mismatch:", error)
      })
    }
  }, [isAuthenticated, user, convexSignOut])

  return {
    // User state
    user,
    userApiKeys,
    isAuthenticated,
    isAuthLoading,

    // Actions
    signOut: convexSignOut,
  }
}
