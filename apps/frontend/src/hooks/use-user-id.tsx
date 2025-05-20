"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"
import { useEffect, createContext, useContext, ReactNode, useState } from "react"
import { v4 as uuidv4 } from "uuid"

const USER_ID_STORAGE_KEY = "dojo-user-id"

const UserContext = createContext<string | null | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const { readStorage, writeStorage } = useLocalStorage()

  const [userId, setUserIdState] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      const storedUserId = readStorage<string>(USER_ID_STORAGE_KEY)
      if (storedUserId === null) {
        const newUserId = uuidv4()
        writeStorage(USER_ID_STORAGE_KEY, newUserId)
        setUserIdState(newUserId)
      } else {
        setUserIdState(storedUserId)
      }
    }
  }, [mounted, readStorage, writeStorage])

  return <UserContext.Provider value={userId}>{children}</UserContext.Provider>
}

export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider")
  }
  return context
}
