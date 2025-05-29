import { Button } from "@/components/ui/button"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { VolumeX, Volume2 } from "lucide-react"

export function SoundToggle() {
  const { isSoundEnabled, setIsSoundEnabled } = useSoundEffectContext()

  return (
    <Button
      size="icon"
      variant="outline"
      className="hover:cursor-pointer"
      onClick={() => setIsSoundEnabled(!isSoundEnabled)}
      aria-label={isSoundEnabled ? "Mute sound" : "Unmute sound"}
    >
      {isSoundEnabled ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
    </Button>
  )
}
