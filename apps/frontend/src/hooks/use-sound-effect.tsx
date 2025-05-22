"use client"

import React, { createContext, useContext, useRef, useCallback, useState } from "react"

interface UseSoundEffectOptions {
  volume?: number
  playbackRate?: number
  interrupt?: boolean
  soundEnabled?: boolean
  preload?: "auto" | "metadata" | "none"
}

interface SoundEffectContextType {
  play: (soundSrc: string, options?: UseSoundEffectOptions) => void
  isSoundEnabled: boolean
  setIsSoundEnabled: (enabled: boolean) => void
}

const SoundEffectContext = createContext<SoundEffectContextType | undefined>(undefined)

export function SoundEffectProvider({ children }: { children: React.ReactNode }) {
  const audioCache = useRef<Record<string, HTMLAudioElement>>({})
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)

  const play = useCallback(
    (soundSrc: string, options: UseSoundEffectOptions = {}) => {
      if (!soundSrc || !isSoundEnabled) return

      let audio = audioCache.current[soundSrc]
      if (!audio) {
        audio = document.createElement("audio")
        audio.src = soundSrc
        audio.preload = options.preload || "auto"
        audio.style.display = "none"
        audio.setAttribute("aria-hidden", "true")
        document.body.appendChild(audio)
        audioCache.current[soundSrc] = audio
      }

      audio.volume = Math.max(0, Math.min(1, options.volume ?? 0.5))
      audio.playbackRate = options.playbackRate ?? 1

      if (options.interrupt || audio.paused) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
    },
    [isSoundEnabled],
  )

  return (
    <SoundEffectContext.Provider value={{ play, isSoundEnabled, setIsSoundEnabled }}>
      {children}
    </SoundEffectContext.Provider>
  )
}

export function useSoundEffectContext() {
  const ctx = useContext(SoundEffectContext)
  if (!ctx) throw new Error("useSoundEffectContext must be used within a SoundEffectProvider")
  return ctx
}
