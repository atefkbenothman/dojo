import { useRef, useCallback, useMemo, useState, useEffect } from "react"

interface UseSoundEffectOptions {
  volume?: number
  playbackRate?: number
  interrupt?: boolean // Should playing restart the sound if already playing?
  soundEnabled?: boolean // Global switch to disable sound
  preload?: "auto" | "metadata" | "none"
  // Add other HTMLAudioElement properties you might want to control
}

// Define a more specific default type to avoid potential undefined issues later
const defaultOptions: Required<
  Pick<
    UseSoundEffectOptions,
    "volume" | "playbackRate" | "interrupt" | "soundEnabled" | "preload"
  >
> = {
  volume: 0.5, // Default volume
  playbackRate: 1,
  interrupt: true, // Default is to restart sound
  soundEnabled: true,
  preload: "auto",
}

export function useSoundEffect(
  soundSrc: string,
  options: UseSoundEffectOptions = {},
) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Combine default and user options, ensuring defaults are applied correctly
  const { volume, playbackRate, interrupt, preload, soundEnabled } = {
    ...defaultOptions,
    ...options,
  }

  // Start as not ready, wait for canplaythrough
  const [isReady, setIsReady] = useState(false)
  // Keep track if the first interaction attempt failed due to policy
  const interactionNeeded = useRef(false)

  // Callback ref to manage the audio element instance
  const setAudioRef = useCallback(
    (node: HTMLAudioElement | null) => {
      // --- REMOVE THE INCORRECT CLEANUP BLOCK THAT WAS HERE ---

      if (node) {
        // Define handlers HERE, within the scope that has 'node'
        const handleCanPlayThrough = () => {
          setIsReady(true)
          interactionNeeded.current = false // Ready, so interaction likely succeeded or is not needed yet
        }
        const handleError = (e: Event | string) => {
          console.error(`Error loading audio: ${soundSrc}`, e)
          setIsReady(false) // Mark as not ready on error
          // Maybe set audioRef.current = null here too? Depends on desired behavior on error.
        }

        // Add listeners when the node is attached
        node.addEventListener("canplaythrough", handleCanPlayThrough)
        node.addEventListener("error", handleError)
        audioRef.current = node // Set the ref

        // Check initial ready state immediately after setting up
        if (node.readyState >= 4) {
          // HAVE_ENOUGH_DATA
          handleCanPlayThrough()
        } else {
          setIsReady(false) // Ensure isReady is false if not enough data yet
        }

        // Return the cleanup function. This function runs when the component
        // unmounts or when soundSrc changes causing this callback to re-run
        // for a potentially new element.
        return () => {
          // Use the 'node' and handlers captured in this closure
          node.removeEventListener("canplaythrough", handleCanPlayThrough)
          node.removeEventListener("error", handleError)
          setIsReady(false) // Reset readiness on cleanup
          // No need to manually nullify audioRef.current here, React manages the ref.
          // If the node is detached, the next call to setAudioRef will receive null.
        }
      } else {
        // Node is detached (node === null passed in)
        audioRef.current = null
        setIsReady(false)
        // The cleanup function returned from the *previous* call (when node existed)
        // should have already run or will run shortly after this.
      }
    },
    [soundSrc], // Re-run if soundSrc changes
  )

  // The core play function
  const play = useCallback(() => {
    // Don't play if sound is disabled globally
    if (!soundEnabled) {
      // console.warn("Sound is disabled via soundEnabled prop."); // Less noisy maybe
      return
    }

    // Don't play if the audio element isn't available or ready
    if (!audioRef.current) {
      console.warn(`Audio element not available for: ${soundSrc}`)
      return
    }
    if (!isReady && !interactionNeeded.current) {
      // Only warn if not specifically waiting for interaction
      console.warn(
        `Sound not ready to play: ${soundSrc}. Current readyState: ${audioRef.current?.readyState}`,
      )
      return
    }

    // Apply dynamic options
    // Use defaultOptions as fallback within the function too for robustness
    audioRef.current.volume = Math.max(
      0,
      Math.min(1, volume ?? defaultOptions.volume),
    )
    audioRef.current.playbackRate = playbackRate ?? defaultOptions.playbackRate

    const playPromise = () => {
      // Ensure we have the ref again (might be overly cautious but safe)
      if (!audioRef.current)
        return Promise.reject(new Error("Audio element lost"))

      if (interrupt || audioRef.current.paused) {
        audioRef.current.currentTime = 0 // Rewind
        return audioRef.current.play()
      }
      // If interrupt is false and sound is already playing, resolve immediately
      return Promise.resolve()
    }

    playPromise().catch((error) => {
      // Check specifically for the autoplay policy error
      if (error.name === "NotAllowedError") {
        console.warn(
          `Audio playback for "${soundSrc}" prevented by browser autoplay policy. Needs user interaction.`,
        )
        // Set flag indicating interaction is needed, subsequent clicks might work
        interactionNeeded.current = true
        setIsReady(false) // Force ready state to false until interaction works
      } else {
        // Log other errors more seriously
        console.error(`Audio playback failed for ${soundSrc}:`, error)
        setIsReady(false) // Mark as not ready on other errors too
      }
    })

    // If interrupt is false and sound is already playing, do nothing.
  }, [soundEnabled, isReady, volume, playbackRate, interrupt, soundSrc]) // Ensure all dependencies are listed

  // Effect to update audio properties when options change after initial load
  useEffect(() => {
    if (audioRef.current && isReady) {
      // Apply only if ready
      audioRef.current.volume = Math.max(
        0,
        Math.min(1, volume ?? defaultOptions.volume),
      )
      audioRef.current.playbackRate =
        playbackRate ?? defaultOptions.playbackRate
      // Note: preload is usually set initially, changing it might require recreating the element
    }
  }, [volume, playbackRate, isReady]) // Add isReady dependency

  // A simple component to render the hidden audio element
  // Memoize it to prevent unnecessary re-renders based on soundSrc/preload
  const AudioComponent = useMemo(() => {
    // Adding a key helps React efficiently replace the element if src changes
    return (
      <audio
        key={soundSrc}
        ref={setAudioRef}
        preload={preload}
        style={{ display: "none" }}
        aria-hidden="true"
        // Consider adding playsInline for mobile browsers
        // playsInline
      >
        <source src={soundSrc} type="audio/mpeg" />
        {/* You might want different source types for broader compatibility */}
        {/* <source src={soundSrc.replace('.mp3', '.ogg')} type="audio/ogg" /> */}
        Your browser does not support the audio element.
      </audio>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundSrc, preload]) // setAudioRef should NOT be a dependency here. Its identity changes based on soundSrc anyway.

  // Expose the audio element ref if needed for advanced control
  return { play, AudioComponent, isReady, audioRef: audioRef }
}
