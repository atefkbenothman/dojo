"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"
import { useStableQuery } from "@/hooks/use-stable-query"
import { GUEST_SESSION_KEY } from "@/lib/constants"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc } from "@dojo/db/convex/_generated/dataModel"
import { useConvexAuth, useMutation } from "convex/react"
import { createContext, useContext, useEffect, ReactNode, useMemo } from "react"
import { v4 as uuidv4 } from "uuid"

interface SessionContextType {
  currentSession: Doc<"sessions"> | null | undefined
  clientSessionId: string | null
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { readStorage, writeStorage } = useLocalStorage()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()

  // Track if we're authenticated or guest
  const isGuest = !isAuthLoading && !isAuthenticated

  // Initialize client session ID synchronously for guests
  const clientSessionId = useMemo(() => {
    if (!isGuest) return null

    let sessionId = readStorage<string>(GUEST_SESSION_KEY)
    if (!sessionId) {
      sessionId = uuidv4()
      writeStorage(GUEST_SESSION_KEY, sessionId)
    }
    return sessionId
  }, [isGuest]) // readStorage and writeStorage are stable

  // Query current session based on auth state
  const authSession = useStableQuery(api.sessions.getCurrentUserSession, isAuthenticated ? {} : "skip")

  const guestSession = useStableQuery(
    api.sessions.getByClientSessionId,
    isGuest && clientSessionId ? { clientSessionId } : "skip",
  )

  const currentSession = isAuthenticated ? authSession : guestSession

  // Session mutations
  const createOrGetSession = useMutation(api.sessions.getOrCreate)

  // Initialize session when auth state is determined
  useEffect(() => {
    // Skip if still loading auth
    if (isAuthLoading) return

    // For guests, wait until we have a clientSessionId
    if (!isAuthenticated && !clientSessionId) return

    const initSession = async () => {
      try {
        if (isAuthenticated) {
          // Authenticated user: create/get session (uses auth context)
          await createOrGetSession({})
        } else if (clientSessionId) {
          // Guest user: use clientSessionId
          await createOrGetSession({ clientSessionId })
        }
      } catch (error) {
        console.error("Failed to initialize session:", error)
      }
    }

    initSession()
  }, [isAuthLoading, isAuthenticated, clientSessionId, createOrGetSession])

  // Memoize context value to prevent unnecessary re-renders
  const currentValue = useMemo<SessionContextType>(
    () => ({
      currentSession,
      clientSessionId,
    }),
    [currentSession, clientSessionId],
  )

  return <SessionContext.Provider value={currentValue}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}
