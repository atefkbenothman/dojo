import { useRef, useCallback, useMemo, useState, useEffect } from "react"

interface UseSoundEffectOptions {
  volume?: number
  playbackRate?: number
  interrupt?: boolean
  soundEnabled?: boolean
  preload?: "auto" | "metadata" | "none"
}

const defaultOptions: Required<
  Pick<UseSoundEffectOptions, "volume" | "playbackRate" | "interrupt" | "soundEnabled" | "preload">
> = {
  volume: 0.5,
  playbackRate: 1,
  interrupt: true,
  soundEnabled: true,
  preload: "auto",
}

export function useSoundEffect(soundSrc: string, options: UseSoundEffectOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { volume, playbackRate, interrupt, preload, soundEnabled } = {
    ...defaultOptions,
    ...options,
  }

  const [isReady, setIsReady] = useState(false)
  const interactionNeeded = useRef(false)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      if (audioRef.current.parentNode) {
        audioRef.current.parentNode.removeChild(audioRef.current)
      }
      audioRef.current = null
      setIsReady(false)
      interactionNeeded.current = false
    }

    if (!soundSrc || !soundEnabled) {
      return
    }

    const audio = document.createElement("audio")
    audioRef.current = audio

    const handleCanPlayThrough = () => {
      setIsReady(true)
      interactionNeeded.current = false
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, Math.min(1, volume ?? defaultOptions.volume))
        audioRef.current.playbackRate = playbackRate ?? defaultOptions.playbackRate
      }
    }

    const handleError = (e: Event | string) => {
      console.error(`Error loading audio: ${soundSrc}`, e)
      setIsReady(false)
    }

    audio.src = soundSrc
    audio.preload = preload
    audio.style.display = "none"
    audio.setAttribute("aria-hidden", "true")

    audio.addEventListener("canplaythrough", handleCanPlayThrough)
    audio.addEventListener("error", handleError)
    audio.addEventListener("loadedmetadata", () => {
      if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && !isReady) {
        handleCanPlayThrough()
      }
    })

    document.body.appendChild(audio)

    if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      handleCanPlayThrough()
    } else {
      setIsReady(false)
    }

    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlayThrough)
      audio.removeEventListener("error", handleError)

      if (audio.parentNode) {
        audio.parentNode.removeChild(audio)
      }
      if (audioRef.current === audio) {
        audioRef.current = null
      }
      setIsReady(false)
      interactionNeeded.current = false
    }
  }, [soundSrc, preload, soundEnabled, volume, playbackRate])

  const play = useCallback(() => {
    if (!soundEnabled) {
      return
    }

    if (!audioRef.current) {
      console.warn(`Audio element not available for: ${soundSrc}`)
      return
    }
    if (!isReady && !interactionNeeded.current) {
      console.warn(`Sound not ready to play: ${soundSrc}. Current readyState: ${audioRef.current?.readyState}`)
      return
    }

    const playPromise = () => {
      if (!audioRef.current) return Promise.reject(new Error("Audio element lost"))

      if (interrupt || audioRef.current.paused) {
        audioRef.current.currentTime = 0
        return audioRef.current.play()
      }
      return Promise.resolve()
    }

    playPromise().catch((error) => {
      if (error.name === "NotAllowedError") {
        console.warn(`Audio playback for "${soundSrc}" prevented by browser autoplay policy. Needs user interaction.`)
        interactionNeeded.current = true
        setIsReady(false)
      } else {
        console.error(`Audio playback failed for ${soundSrc}:`, error)
        setIsReady(false)
      }
    })
  }, [soundEnabled, isReady, interrupt, soundSrc])

  return { play, isReady, audioRef: audioRef }
}
