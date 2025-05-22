import { Button } from "@/components/ui/button"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { VolumeX, Volume2 } from "lucide-react"
import { useCallback } from "react"

export function SoundToggle() {
  const { play, isSoundEnabled, setIsSoundEnabled } = useSoundEffectContext()

  const handleToggle = useCallback(() => {
    play("./click.mp3", { volume: 0.5 })
    setIsSoundEnabled(!isSoundEnabled)
  }, [isSoundEnabled, setIsSoundEnabled, play])

  return (
    <Button
      size="icon"
      variant="outline"
      className="hover:cursor-pointer"
      onMouseDown={handleToggle}
      aria-label={isSoundEnabled ? "Mute sound" : "Unmute sound"}
    >
      {isSoundEnabled ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
    </Button>
  )
}
