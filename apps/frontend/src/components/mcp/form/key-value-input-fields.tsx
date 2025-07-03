"use client"

import { Button } from "@/components/ui/button"
import { FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"

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

  return (
    <FormItem className="space-y-2">
      <p className="text-base font-medium text-muted-foreground">{fieldLabel}</p>
      <div className="border rounded-lg p-3 bg-muted/20">
        <div className="grid gap-2">
          {pairs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No {fieldName === "headers" ? "headers" : "environment variables"} configured
            </p>
          )}
          {pairs.map((pair, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={pair.key}
                onChange={(e) => handleKeyChange(index, e.target.value)}
                className={`w-1/2 text-xs ${
                  disabled ? "bg-background text-primary/70 cursor-not-allowed" : "bg-background text-primary/90"
                }`}
                placeholder={placeholder.key}
                disabled={disabled}
              />
              <Input
                value={pair.value}
                onChange={(e) => handleValueChange(index, e.target.value)}
                className="w-1/2 bg-background"
                placeholder={placeholder.value}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:cursor-pointer"
                onClick={() => handleRemovePair(index)}
                aria-label={`Remove ${pair.key}`}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full mt-2 hover:cursor-pointer"
            onClick={handleAddPair}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add {fieldName === "headers" ? "Header" : "Environment Variable"}
          </Button>
        </div>
      </div>
    </FormItem>
  )
}
