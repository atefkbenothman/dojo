import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { useQuery } from "convex/react"

export function useUser() {
  const user = useQuery(api.user.currentUser)
  const userApiKeys = useQuery(api.apiKeys.getApiKeysForUser, user && user._id ? { userId: user._id } : "skip") || []
  const { signOut } = useAuthActions()

  if (user === null) {
    signOut()
  }

  return { user, userApiKeys }
}
