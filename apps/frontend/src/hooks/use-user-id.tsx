"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"
import { useEffect, createContext, useContext, ReactNode, useState } from "react"
import { v4 as uuidv4 } from "uuid"

const USER_ID_STORAGE_KEY = "dojo-user-id"

interface UserContextValue {
  userId: string
  backendHealth: "unknown" | "healthy" | "unhealthy"
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
  backendHealth?: "unknown" | "healthy" | "unhealthy"
}

export function UserProvider({ children, backendHealth = "unknown" }: UserProviderProps) {
  const { readStorage, writeStorage } = useLocalStorage()
  const [userId, setUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    let storedUserId = readStorage<string>(USER_ID_STORAGE_KEY)
    if (!storedUserId) {
      storedUserId = uuidv4()
      writeStorage(USER_ID_STORAGE_KEY, storedUserId)
    }
    setUserId(storedUserId)
    document.cookie = `userId=${storedUserId}; path=/; max-age=31536000`
  }, [readStorage, writeStorage])

  if (!userId) return null

  return <UserContext.Provider value={{ userId, backendHealth }}>{children}</UserContext.Provider>
}

export function useUserContext(): UserContextValue {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider")
  }
  return context
}
