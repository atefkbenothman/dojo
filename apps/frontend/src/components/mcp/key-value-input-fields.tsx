"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export interface KeyValuePair {
  key: string
  value: string
}

interface KeyValueInputFieldsProps {
  pairs: KeyValuePair[]
  mode: "add" | "edit"
  onUpdatePairs: (pairs: KeyValuePair[]) => void
  disabled?: boolean
  fieldName: string // "envPairs" | "headers"
  fieldLabel: string // "Environment Variables" | "Headers"
  placeholder?: {
    key: string
    value: string
  }
}

export function KeyValueInputFields({
  pairs,
  mode,
  onUpdatePairs,
  disabled = false,
  fieldName,
  fieldLabel,
  placeholder = { key: "KEY_NAME", value: "Value" },
}: KeyValueInputFieldsProps) {
  const handleAddPair = () => {
    if (disabled) return
    const defaultKey = fieldName === "headers" ? "" : "API_KEY"
    onUpdatePairs([...pairs, { key: defaultKey, value: "" }])
  }

  const handleRemovePair = (index: number) => {
    if (disabled) return
    onUpdatePairs(pairs.filter((_, i) => i !== index))
  }

  const handleKeyChange = (index: number, key: string) => {
    if (disabled) return
    const updated = pairs.map((pair, i) => (i === index ? { ...pair, key } : pair))
    onUpdatePairs(updated)
  }

  const handleValueChange = (index: number, value: string) => {
    if (disabled) return
    const updated = pairs.map((pair, i) => (i === index ? { ...pair, value } : pair))
    onUpdatePairs(updated)
  }

  if (pairs.length === 0 && mode === "edit") return null

  return (
    <FormItem>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={fieldName}>
          <AccordionTrigger className="hover:cursor-pointer">
            <FormLabel className="text-primary/80 text-xs">{fieldLabel}</FormLabel>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              {pairs.map((pair, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={pair.key}
                    onChange={(e) => handleKeyChange(index, e.target.value)}
                    className={`w-1/2 text-xs focus-visible:ring-0 focus-visible:border-inherit ${
                      mode === "edit" || disabled
                        ? "bg-muted/70 text-primary/70 cursor-not-allowed"
                        : "bg-muted/70 text-primary/90"
                    }`}
                    placeholder={placeholder.key}
                    disabled={mode === "edit" || disabled}
                  />
                  <Input
                    value={pair.value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    className="w-1/2 bg-muted/50 focus-visible:ring-0 focus-visible:border-inherit"
                    placeholder={placeholder.value}
                    disabled={disabled}
                  />
                  {mode === "add" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-1 text-destructive hover:cursor-pointer"
                      onClick={() => handleRemovePair(index)}
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
                  onClick={handleAddPair}
                  disabled={disabled}
                >
                  + Add {fieldName === "headers" ? "Header" : "Key"}
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </FormItem>
  )
}
