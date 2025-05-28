"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { EnvPair } from "@/hooks/use-mcp-form"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"

interface EnvInputFieldsProps {
  envPairs: EnvPair[]
  mode: "add" | "edit"
  onUpdateEnvPairs: (pairs: EnvPair[]) => void
}

export function EnvInputFields({ envPairs, mode, onUpdateEnvPairs }: EnvInputFieldsProps) {
  const { play } = useSoundEffectContext()

  const handleAddKey = () => {
    play("./sounds/click.mp3", { volume: 0.5 })
    onUpdateEnvPairs([...envPairs, { key: "API_KEY", value: "" }])
  }

  const handleRemoveKey = (index: number) => {
    onUpdateEnvPairs(envPairs.filter((_, i) => i !== index))
  }

  const handleKeyChange = (index: number, key: string) => {
    const updated = envPairs.map((pair, i) => (i === index ? { ...pair, key } : pair))
    onUpdateEnvPairs(updated)
  }

  const handleValueChange = (index: number, value: string) => {
    const updated = envPairs.map((pair, i) => (i === index ? { ...pair, value } : pair))
    onUpdateEnvPairs(updated)
  }

  if (envPairs.length === 0 && mode === "edit") return null

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="environment">
        <AccordionTrigger className="hover:cursor-pointer">Environment Variables</AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-2">
            {envPairs.map((pair, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={pair.key}
                  onChange={(e) => handleKeyChange(index, e.target.value)}
                  className={`w-1/2 text-xs focus-visible:ring-0 focus-visible:border-inherit ${
                    mode === "edit" ? "bg-muted/70 text-primary/70 cursor-not-allowed" : "bg-muted/70 text-primary/90"
                  }`}
                  placeholder="KEY_NAME"
                  disabled={mode === "edit"}
                />
                <Input
                  value={pair.value}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  className="w-1/2 bg-muted/50 focus-visible:ring-0 focus-visible:border-inherit"
                  placeholder="Value"
                />
                {mode === "add" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-1 text-destructive hover:cursor-pointer"
                    onClick={() => {
                      play("./sounds/click.mp3", { volume: 0.5 })
                      handleRemoveKey(index)
                    }}
                    aria-label={`Remove ${pair.key}`}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            {mode === "add" && (
              <Button
                type="button"
                variant="secondary"
                className="w-full mt-2 hover:cursor-pointer"
                onClick={handleAddKey}
              >
                + Add Key
              </Button>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
