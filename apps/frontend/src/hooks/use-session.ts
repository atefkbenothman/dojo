"use client"

import { useLocalStorage } from "./use-local-storage"
import { useUser } from "./use-user"
import { useSessionStore } from "@/store/use-session-store"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { useConvexAuth } from "convex/react"
import { useEffect } from "react"

const GUEST_SESSION_KEY = "guest-session-id"

export function useSession() {
  const { isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const { guestSessionId, setGuestSessionId: setGuestSessionIdInStore } = useSessionStore()
  const { readStorage, writeStorage } = useLocalStorage()

  // On initial mount, try to load the guest session ID from local storage.
  useEffect(() => {
    const storedGuestId = readStorage<Id<"sessions">>(GUEST_SESSION_KEY)
    if (storedGuestId) {
      setGuestSessionIdInStore(storedGuestId)
    }
  }, [readStorage, setGuestSessionIdInStore])

  const setGuestSessionId = (id: Id<"sessions"> | null) => {
    setGuestSessionIdInStore(id)
    if (id) {
      writeStorage(GUEST_SESSION_KEY, id)
    }
  }

  return {
    // The single, authoritative session ID for the current user.
    // It's the real user's ID if they're logged in, otherwise it's the guest ID.
    sessionId: isAuthenticated ? user?._id : guestSessionId,
    // Only return the guestSessionId if the user is NOT authenticated.
    guestSessionId: isAuthenticated ? null : guestSessionId,
    // The function to update the guest ID when the backend provides one.
    setGuestSessionId,
  }
}
