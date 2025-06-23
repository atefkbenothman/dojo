"use client"

import { Button } from "@/components/ui/button"
import { Minus, Plus, Maximize2, Minimize2 } from "lucide-react"

interface CanvasZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleExpandAll: () => void
  areAllExpanded: boolean
  minZoom: number
  maxZoom: number
}

export function CanvasZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onToggleExpandAll,
  areAllExpanded,
  minZoom,
  maxZoom,
}: CanvasZoomControlsProps) {
  const zoomPercentage = Math.round(zoom * 100)
  const canZoomIn = zoom < maxZoom
  const canZoomOut = zoom > minZoom

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-background/95 backdrop-blur-sm border-[1.5px] rounded-md shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-1 hover:cursor-pointer"
        onClick={onZoomOut}
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
        className="h-8 w-8 p-1 hover:cursor-pointer"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <div className="w-px h-8 bg-border" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-1 hover:cursor-pointer"
        onClick={onToggleExpandAll}
        title={areAllExpanded ? "Collapse all steps" : "Expand all steps"}
      >
        {areAllExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  )
}
