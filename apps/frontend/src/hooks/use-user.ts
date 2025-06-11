"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { useConvexAuth } from "convex/react"
import { useQuery } from "convex/react"
import { useEffect } from "react"

export function useUser() {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()

  const user = useQuery(api.user.currentUser)
  const userApiKeys = useQuery(api.apiKeys.getApiKeysForUser, user && user._id ? { userId: user._id } : "skip") || []

  useEffect(() => {
    if (user === undefined) {
      return
    }
    if (isAuthenticated && user === null) {
      signOut()
    }
  }, [isAuthenticated, user, signOut])

  return { user, userApiKeys }
}
