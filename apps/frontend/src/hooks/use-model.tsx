"use client"

import type { AIModel } from "@dojo/config"
import { createContext, useContext, useMemo, useState } from "react"

export interface ModelContextType {
  models: AIModel[]
  selectedModel: AIModel | null
  setSelectedModelId: (id: string) => void
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

export function ModelProvider({
  children,
  aiModels,
}: {
  children: React.ReactNode
  aiModels: Record<string, AIModel>
}) {
  const [selectedModelId, setSelectedModelId] = useState<string>("gemini-1.5-flash")

  const selectedModel = useMemo((): AIModel | null => {
    return aiModels[selectedModelId as keyof typeof aiModels]!
  }, [selectedModelId, aiModels])

  return (
    <ModelContext.Provider
      value={{
        models: Object.values(aiModels),
        selectedModel,
        setSelectedModelId,
      }}
    >
      {children}
    </ModelContext.Provider>
  )
}

export function useModelContext() {
  const ctx = useContext(ModelContext)
  if (!ctx) {
    throw new Error("useModelContext must be used within a ModelProvider")
  }
  return ctx
}
