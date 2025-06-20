"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseCanvasZoomProps {
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
}

export function useCanvasZoom({ minZoom = 0.25, maxZoom = 2, zoomStep = 0.1 }: UseCanvasZoomProps = {}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const startPanRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)

  // Zoom with mouse wheel
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Only handle zoom for pinch gestures (ctrlKey) or actual mouse wheel with meta/ctrl
      const isPinchGesture = e.ctrlKey
      const isZoomIntent = e.metaKey || e.ctrlKey

      if (!isPinchGesture && !isZoomIntent) {
        // Allow normal scrolling
        return
      }

      e.preventDefault()

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Use smaller multiplier for pinch gestures
      const multiplier = isPinchGesture ? 1 : 1

      // Calculate zoom
      const delta = e.deltaY > 0 ? -zoomStep * multiplier : zoomStep * multiplier
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta))

      if (newZoom !== zoom) {
        // Calculate new pan to zoom towards cursor
        const zoomRatio = newZoom / zoom
        const newPanX = x - (x - pan.x) * zoomRatio
        const newPanY = y - (y - pan.y) * zoomRatio

        setZoom(newZoom)
        setPan({ x: newPanX, y: newPanY })
      }
    },
    [minZoom, maxZoom, zoomStep, zoom, pan],
  )

  // Pan with mouse drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Check if clicking on interactive elements
      const target = e.target as HTMLElement
      const clickedElement = target.closest('button, input, textarea, select, a, [role="button"], [draggable="true"]')

      // Don't start panning if clicking on interactive elements
      if (clickedElement) return

      // Allow panning with middle mouse or left mouse on canvas
      if (e.button === 1 || e.button === 0) {
        setIsPanning(true)
        startPanRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: pan.x,
          panY: pan.y,
        }
        e.preventDefault()
      }
    },
    [pan],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning) return

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Use requestAnimationFrame to throttle updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const deltaX = e.clientX - startPanRef.current.x
        const deltaY = e.clientY - startPanRef.current.y

        setPan({
          x: startPanRef.current.panX + deltaX,
          y: startPanRef.current.panY + deltaY,
        })
      })
    },
    [isPanning],
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Zoom controls
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(maxZoom, zoom + zoomStep)
    const container = containerRef.current
    if (!container) {
      setZoom(newZoom)
      return
    }

    // Zoom towards center
    const rect = container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const zoomRatio = newZoom / zoom
    const newPanX = centerX - (centerX - pan.x) * zoomRatio
    const newPanY = centerY - (centerY - pan.y) * zoomRatio

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [maxZoom, zoomStep, zoom, pan])

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(minZoom, zoom - zoomStep)
    const container = containerRef.current
    if (!container) {
      setZoom(newZoom)
      return
    }

    // Zoom towards center
    const rect = container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const zoomRatio = newZoom / zoom
    const newPanX = centerX - (centerX - pan.x) * zoomRatio
    const newPanY = centerY - (centerY - pan.y) * zoomRatio

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [minZoom, zoomStep, zoom, pan])

  const resetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const fitToView = useCallback(() => {
    const container = containerRef.current
    const content = container?.querySelector("[data-canvas-content]") as HTMLElement
    if (!container || !content) return

    const containerRect = container.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()

    // Calculate zoom to fit
    const scaleX = containerRect.width / contentRect.width
    const scaleY = containerRect.height / contentRect.height
    const newZoom = Math.min(Math.max(minZoom, Math.min(scaleX, scaleY) * 0.9), maxZoom)

    // Center the content
    const newPanX = (containerRect.width - contentRect.width * newZoom) / 2
    const newPanY = (containerRect.height - contentRect.height * newZoom) / 2

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [minZoom, maxZoom])

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Store references to handlers for cleanup
    const wheelHandler = handleWheel
    const moveHandler = handleMouseMove
    const upHandler = handleMouseUp

    container.addEventListener("wheel", wheelHandler, { passive: false })

    // Only add mouse move/up listeners when panning
    if (isPanning) {
      document.addEventListener("mousemove", moveHandler, { passive: true })
      document.addEventListener("mouseup", upHandler, { passive: true })
    }

    return () => {
      container.removeEventListener("wheel", wheelHandler)
      document.removeEventListener("mousemove", moveHandler)
      document.removeEventListener("mouseup", upHandler)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [handleWheel, handleMouseMove, handleMouseUp, isPanning])

  return {
    zoom,
    pan,
    isPanning,
    containerRef,
    handleMouseDown,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToView,
  }
}
