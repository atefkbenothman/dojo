"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useCallback } from "react"

export function useUrlSelection() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const selectedId = searchParams.get("id")

  const setSelectedId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams)
      const currentId = searchParams.get("id")

      if (id) {
        params.set("id", id)
      } else {
        params.delete("id")
      }

      // Smart navigation decision
      if (id === null || id === currentId) {
        // Deselection or same selection toggle - don't create history
        router.replace(`?${params.toString()}`)
      } else {
        // New selection - create history entry
        router.push(`?${params.toString()}`)
      }
    },
    [searchParams, router],
  )

  return { selectedId, setSelectedId }
}
