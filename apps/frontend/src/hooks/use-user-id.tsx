"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"
import { useEffect, createContext, useContext, ReactNode, useState } from "react"
import { v4 as uuidv4 } from "uuid"

const USER_ID_STORAGE_KEY = "dojo-user-id"

const UserContext = createContext<string | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const { readStorage, writeStorage } = useLocalStorage()
  const [userId, setUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    let storedUserId = readStorage<string>(USER_ID_STORAGE_KEY)
    if (!storedUserId) {
      storedUserId = uuidv4()
      writeStorage(USER_ID_STORAGE_KEY, storedUserId)
    }
    setUserId(storedUserId)
  }, [readStorage, writeStorage])

  if (!userId) return null

  return <UserContext.Provider value={userId}>{children}</UserContext.Provider>
}

export function useUserContext(): string {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider")
  }
  return context
}
