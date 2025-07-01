"use client"

import { Button } from "@/components/ui/button"
import { Minus, Plus, Focus } from "lucide-react"
import { memo, useCallback } from "react"
import { useReactFlow, useStore } from "reactflow"

interface CustomReactFlowControlsProps {
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
  className?: string
}

export const CustomReactFlowControls = memo(function CustomReactFlowControls({
  minZoom = 0.25,
  maxZoom = 2,
  zoomStep = 0.1,
  className = "",
}: CustomReactFlowControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  // Use the store to get current zoom level
  const zoom = useStore((s) => s.transform[2])
  const zoomPercentage = Math.round(zoom * 100)
  const canZoomIn = zoom < maxZoom
  const canZoomOut = zoom > minZoom

  const handleZoomIn = useCallback(() => {
    zoomIn()
  }, [zoomIn])

  const handleZoomOut = useCallback(() => {
    zoomOut()
  }, [zoomOut])

  const handleFitView = useCallback(() => {
    fitView({
      padding: 0.3,
      includeHiddenNodes: false,
    })
  }, [fitView])

  return (
    <div className={`flex items-center gap-1 bg-background/95 border-[1.5px] h-12 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-1 hover:cursor-pointer hover:bg-transparent dark:hover:bg-transparent"
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        title="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <div className="px-3 py-1 text-sm font-medium text-muted-foreground min-w-[60px] text-center">
        {zoomPercentage}%
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-1 hover:cursor-pointer hover:bg-transparent dark:hover:bg-transparent"
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        title="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* <div className="w-px h-12 bg-border" /> */}

      <Button
        variant="ghost"
        size="icon"
        className="hover:cursor-pointer hover:bg-transparent dark:hover:bg-transparent w-8 gap-0 h-full border-l-[1.5px]"
        onClick={handleFitView}
        title="Fit to view"
      >
        <Focus className="h-4 w-4" />
      </Button>
    </div>
  )
})
