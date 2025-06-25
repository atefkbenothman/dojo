"use client"

import { useState, useCallback, DragEvent } from "react"

interface UseDragAndDropProps<T> {
  items: T[]
  onReorder: (newItems: T[]) => void
}

export function useDragAndDrop<T>({ items, onReorder }: UseDragAndDropProps<T>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = useCallback((e: DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    // Add a custom class to the dragged element
    const element = e.currentTarget as HTMLElement
    element.classList.add("opacity-50")
  }, [])

  const handleDragEnd = useCallback((e: DragEvent) => {
    const element = e.currentTarget as HTMLElement
    element.classList.remove("opacity-50")
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleDragOver = useCallback(
    (e: DragEvent, index: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"

      if (draggedIndex === null || draggedIndex === index) return

      setDragOverIndex(index)
    },
    [draggedIndex],
  )

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent, dropIndex: number) => {
      e.preventDefault()

      if (draggedIndex === null || draggedIndex === dropIndex) {
        setDragOverIndex(null)
        return
      }

      const newItems = [...items]
      const draggedItem = items[draggedIndex]

      if (!draggedItem) {
        setDragOverIndex(null)
        return
      }

      newItems.splice(draggedIndex, 1)

      // Adjust drop index if dragging from before to after
      const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
      newItems.splice(adjustedDropIndex, 0, draggedItem)

      onReorder(newItems)
      setDragOverIndex(null)
    },
    [draggedIndex, items, onReorder],
  )

  return {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
