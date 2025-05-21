import { useCallback } from "react"

export function useLocalStorage() {
  const readStorage = useCallback(function readStorage<T>(key: string): T | null {
    if (typeof window === "undefined") return null
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : null
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return null
    }
  }, [])

  const writeStorage = useCallback(function writeStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [])

  const removeStorage = useCallback(function removeStorage(key: string): void {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [])

  return { readStorage, writeStorage, removeStorage }
}
