"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import { useAIModels } from "@/hooks/use-ai-models"
import { cn } from "@/lib/utils"
import { AIModelWithAvailability } from "@dojo/db/convex/types"
import { useMemo } from "react"

interface ModelSelectProps {
  disabled?: boolean
  className?: string
  value: string | undefined
  onValueChange: (value: string) => void
}

export function ModelSelect({ disabled = false, className, value, onValueChange }: ModelSelectProps) {
  const { modelsWithProviders } = useAIModels()

  // Group models by provider
  const groupedModels = useMemo(() => {
    const grouped: Record<string, AIModelWithAvailability[number][]> = {}

    modelsWithProviders.forEach((model) => {
      const providerName = model.provider?.name || "Other"
      if (!grouped[providerName]) {
        grouped[providerName] = []
      }
      grouped[providerName].push(model)
    })

    return grouped
  }, [modelsWithProviders])

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-fit bg-muted/20 ring-none focus-visible:ring-0", className)}>
        <SelectValue placeholder="Model" />
      </SelectTrigger>
      <SelectContent align="start">
        {Object.entries(groupedModels).map(([groupName, models]) => (
          <SelectGroup key={groupName}>
            <SelectLabel>{groupName}</SelectLabel>
            {models.map((model) => (
              <SelectItem
                key={model.modelId}
                value={model.modelId}
                className="cursor-pointer"
                disabled={!model.isAvailable}
              >
                {model.name}
                {model.requiresApiKey && !model.isAvailable && (
                  <span className="text-muted-foreground text-xs ml-1 font-normal">(requires key)</span>
                )}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
