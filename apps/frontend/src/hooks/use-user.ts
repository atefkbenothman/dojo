"use client"

import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { useConvexAuth } from "convex/react"
import { useQuery } from "convex/react"
import { useEffect } from "react"

export function useUser() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const { play } = useSoundEffectContext()

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

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) {
      play("./sounds/connect.mp3", { volume: 0.5 })
    } else {
      play("./sounds/disconnect.mp3", { volume: 0.5 })
    }
  }, [isAuthenticated, isLoading, play])

  return { user, userApiKeys }
}
