"use client"

import { useState, useEffect } from "react"

export function LoadingAnimation() {
  const [frameIndex, setFrameIndex] = useState(0)
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length)
    }, 80)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center w-fit px-1 py-4 text-primary">
      <span className="text-lg font-mono">{frames[frameIndex]}</span>
    </div>
  )
}

// Inline version for buttons
export function LoadingAnimationInline({ className = "" }: { className?: string }) {
  const [frameIndex, setFrameIndex] = useState(0)
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length)
    }, 80)

    return () => clearInterval(interval)
  }, [])

  return <span className={`inline-flex items-center justify-center font-mono ${className}`}>{frames[frameIndex]}</span>
}
