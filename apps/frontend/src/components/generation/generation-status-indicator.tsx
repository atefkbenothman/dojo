import { memo } from "react"

type GenerationStatus = "running" | "completed" | "failed" | null | undefined

interface GenerationStatusIndicatorProps {
  status?: GenerationStatus
}

export const GenerationStatusIndicator = memo(function GenerationStatusIndicator({
  status,
}: GenerationStatusIndicatorProps) {
  if (status === "running") return <div className="h-2 w-2 bg-yellow-500" />
  if (status === "completed") return <div className="h-2 w-2 bg-green-500" />
  if (status === "failed") return <div className="h-2 w-2 bg-red-500" />
  return null
})
