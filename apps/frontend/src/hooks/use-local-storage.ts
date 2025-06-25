import { useRef } from "react"

// Create stable storage functions that don't change on every render
function readStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : null
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return null
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error)
  }
}

function removeStorage(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error)
  }
}

export function useLocalStorage() {
  // Use refs to maintain stable function references across renders
  const readStorageRef = useRef(readStorage)
  const writeStorageRef = useRef(writeStorage)
  const removeStorageRef = useRef(removeStorage)

  return { 
    readStorage: readStorageRef.current, 
    writeStorage: writeStorageRef.current, 
    removeStorage: removeStorageRef.current 
  }
}
