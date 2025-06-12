"use client"

import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from "react"

interface UseSoundEffectOptions {
  volume?: number
  playbackRate?: number
  interrupt?: boolean
  soundEnabled?: boolean
}

interface SoundEffectContextType {
  play: (soundSrc: string, options?: UseSoundEffectOptions) => void
  isSoundEnabled: boolean
  setIsSoundEnabled: (enabled: boolean) => void
  isLoading: boolean
}

const SoundEffectContext = createContext<SoundEffectContextType | undefined>(undefined)

export function SoundEffectProvider({ children }: { children: React.ReactNode }) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const bufferCacheRef = useRef<Record<string, AudioBuffer>>({})
  const loadingPromisesRef = useRef<Record<string, Promise<AudioBuffer>>>({})
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [isLoading] = useState(false)

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        // Resume context if it's suspended (required for some browsers)
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume()
        }
      }
    }

    // Initialize on first user interaction to comply with browser autoplay policies
    const handleUserInteraction = () => {
      initAudioContext()
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }

    document.addEventListener("click", handleUserInteraction)
    document.addEventListener("keydown", handleUserInteraction)

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const loadSound = useCallback(async (soundSrc: string): Promise<AudioBuffer> => {
    // Return cached buffer if available
    if (bufferCacheRef.current[soundSrc]) {
      return bufferCacheRef.current[soundSrc]
    }

    // Return existing loading promise if already loading
    if (loadingPromisesRef.current[soundSrc]) {
      return loadingPromisesRef.current[soundSrc]
    }

    // Start loading the sound
    const loadingPromise = (async () => {
      try {
        const response = await fetch(soundSrc)
        if (!response.ok) {
          throw new Error(`Failed to load sound: ${soundSrc}`)
        }

        const arrayBuffer = await response.arrayBuffer()

        if (!audioContextRef.current) {
          throw new Error("AudioContext not initialized")
        }

        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
        bufferCacheRef.current[soundSrc] = audioBuffer
        delete loadingPromisesRef.current[soundSrc]

        return audioBuffer
      } catch (error) {
        delete loadingPromisesRef.current[soundSrc]
        console.error(`Failed to load sound ${soundSrc}:`, error)
        throw error
      }
    })()

    loadingPromisesRef.current[soundSrc] = loadingPromise
    return loadingPromise
  }, [])

  const play = useCallback(
    (soundSrc: string, options: UseSoundEffectOptions = {}) => {
      if (!soundSrc || !isSoundEnabled || !audioContextRef.current) return

      // Load and play the sound
      loadSound(soundSrc)
        .then((buffer) => {
          if (!audioContextRef.current || audioContextRef.current.state === "closed") return

          // Create a new buffer source for this playback
          const source = audioContextRef.current.createBufferSource()
          source.buffer = buffer

          // Create gain node for volume control
          const gainNode = audioContextRef.current.createGain()
          gainNode.gain.value = Math.max(0, Math.min(1, options.volume ?? 0.5))

          // Connect nodes
          source.connect(gainNode)
          gainNode.connect(audioContextRef.current.destination)

          // Set playback rate
          source.playbackRate.value = options.playbackRate ?? 1

          // Play the sound
          source.start(0)

          // Clean up after playback
          source.onended = () => {
            source.disconnect()
            gainNode.disconnect()
          }
        })
        .catch((error) => {
          console.error("Failed to play sound:", error)
        })
    },
    [isSoundEnabled, loadSound],
  )

  return (
    <SoundEffectContext.Provider value={{ play, isSoundEnabled, setIsSoundEnabled, isLoading }}>
      {children}
    </SoundEffectContext.Provider>
  )
}

export function useSoundEffectContext() {
  const ctx = useContext(SoundEffectContext)
  if (!ctx) throw new Error("useSoundEffectContext must be used within a SoundEffectProvider")
  return ctx
}
