"use client"

import { useLocalStorage } from "./use-local-storage"
import { useAuthActions } from "@convex-dev/auth/react"
import { GUEST_SESSION_KEY } from "@/lib/constants"
import { api } from "@dojo/db/convex/_generated/api"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useState, useMemo, useRef } from "react"
import { v4 as uuidv4 } from "uuid"

export function useUser() {
  // Auth state
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const { signOut: convexSignOut } = useAuthActions()

  // User data
  const user = useQuery(api.user.currentUser)
  const userApiKeys = useQuery(api.apiKeys.getMyApiKeys, {}) || []

  // Session state
  const [isInitializing, setIsInitializing] = useState(false)

  // Local storage
  const { readStorage, writeStorage, removeStorage } = useLocalStorage()

  // Track previous auth state
  const prevIsAuthenticated = useRef(isAuthenticated)

  // Get current session ID
  const currentSessionId = useMemo(() => {
    if (isAuthenticated && user) {
      return user._id
    }
    return readStorage<string>(GUEST_SESSION_KEY)
  }, [isAuthenticated, user, readStorage])

  // Query current session
  const session = useQuery(api.sessions.getByUserId, isAuthenticated && user ? { userId: user._id } : "skip")
  const guestSession = useQuery(
    api.sessions.getByClientSessionId,
    !isAuthenticated && currentSessionId ? { clientSessionId: currentSessionId } : "skip",
  )

  const currentSession = isAuthenticated ? session : guestSession
  
  // Session is ready when it exists in database and not initializing
  const isSessionReady = useMemo(() => {
    return !!currentSession && !isInitializing
  }, [currentSession, isInitializing])

  // Convex mutations
  const createOrGetSession = useMutation(api.sessions.getOrCreate)

  // Initialize session
  const initializeSession = useCallback(async () => {
    if (isInitializing || isAuthLoading) return

    setIsInitializing(true)

    try {
      if (isAuthenticated && user) {
        // Authenticated user: create/get session by userId
        await createOrGetSession({ userId: user._id })
      } else if (!isAuthenticated) {
        // Guest user: use clientSessionId
        let clientSessionId = readStorage<string>(GUEST_SESSION_KEY)

        if (!clientSessionId) {
          clientSessionId = uuidv4()
          writeStorage(GUEST_SESSION_KEY, clientSessionId)
        }

        await createOrGetSession({ clientSessionId })
      }
    } catch (error) {
      console.error("Failed to initialize session:", error)
    } finally {
      setIsInitializing(false)
    }
  }, [isAuthenticated, user, isAuthLoading, createOrGetSession, readStorage, writeStorage, isInitializing])

  // Custom sign out that handles session creation
  const signOut = useCallback(async () => {
    // Sign out from Convex auth
    await convexSignOut()

    // Clear existing client session ID
    removeStorage(GUEST_SESSION_KEY)

    // Generate new client session ID for guest usage
    const newClientSessionId = uuidv4()
    writeStorage(GUEST_SESSION_KEY, newClientSessionId)

    // Create new guest session
    try {
      await createOrGetSession({ clientSessionId: newClientSessionId })
    } catch (error) {
      console.error("Failed to create guest session after logout:", error)
    }
  }, [convexSignOut, removeStorage, writeStorage, createOrGetSession])

  // Auto sign out if authenticated but no user
  useEffect(() => {
    if (user === undefined) {
      return
    }
    if (isAuthenticated && user === null) {
      convexSignOut()
    }
  }, [isAuthenticated, user, convexSignOut])

  // Handle session changes when users login/logout
  useEffect(() => {
    if (isAuthLoading) return

    // For authenticated users, wait for user data to load
    if (isAuthenticated && user === undefined) return

    // Detect auth state transition
    const authStateChanged = prevIsAuthenticated.current !== isAuthenticated

    if (authStateChanged && !isInitializing) {
      // Auth state changed, reinitialize session
      prevIsAuthenticated.current = isAuthenticated
      initializeSession()
    }
  }, [isAuthenticated, isAuthLoading, user, isInitializing, initializeSession])

  return {
    // User state
    user,
    userApiKeys,
    isAuthenticated,
    isAuthLoading,

    // Session state
    currentSession,
    isSessionReady,
    isInitializing,
    initializeSession,

    // Actions
    signOut,
  }
}
