"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export interface EnvPair {
  key: string
  value: string
}

interface EnvInputFieldsProps {
  envPairs: EnvPair[]
  mode: "add" | "edit"
  onUpdateEnvPairs: (pairs: EnvPair[]) => void
  disabled?: boolean
}

export function EnvInputFields({ envPairs, mode, onUpdateEnvPairs, disabled = false }: EnvInputFieldsProps) {
  const handleAddKey = () => {
    if (disabled) return
    onUpdateEnvPairs([...envPairs, { key: "API_KEY", value: "" }])
  }

  const handleRemoveKey = (index: number) => {
    if (disabled) return
    onUpdateEnvPairs(envPairs.filter((_, i) => i !== index))
  }

  const handleKeyChange = (index: number, key: string) => {
    if (disabled) return
    const updated = envPairs.map((pair, i) => (i === index ? { ...pair, key } : pair))
    onUpdateEnvPairs(updated)
  }

  const handleValueChange = (index: number, value: string) => {
    if (disabled) return
    const updated = envPairs.map((pair, i) => (i === index ? { ...pair, value } : pair))
    onUpdateEnvPairs(updated)
  }

  if (envPairs.length === 0 && mode === "edit") return null

  return (
    <FormItem>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="environment">
          <AccordionTrigger className="hover:cursor-pointer">
            <FormLabel className="text-primary/80 text-xs">Environment Variables</FormLabel>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              {envPairs.map((pair, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={pair.key}
                    onChange={(e) => handleKeyChange(index, e.target.value)}
                    className={`w-1/2 text-xs focus-visible:ring-0 focus-visible:border-inherit ${
                      mode === "edit" || disabled
                        ? "bg-muted/70 text-primary/70 cursor-not-allowed"
                        : "bg-muted/70 text-primary/90"
                    }`}
                    placeholder="KEY_NAME"
                    disabled={mode === "edit" || disabled}
                  />
                  <Input
                    value={pair.value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    className="w-1/2 bg-muted/50 focus-visible:ring-0 focus-visible:border-inherit"
                    placeholder="Value"
                    disabled={disabled}
                  />
                  {mode === "add" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-1 text-destructive hover:cursor-pointer"
                      onClick={() => handleRemoveKey(index)}
                      aria-label={`Remove ${pair.key}`}
                      disabled={disabled}
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
                  disabled={disabled}
                >
                  + Add Key
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </FormItem>
  )
}
