"use client"

import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from "@/lib/config"
import type { AIModelInfo } from "@/lib/types"
import { useState, createContext, useContext } from "react"

interface ModelContextType {
  availableModels: AIModelInfo[]
  selectedModelId: string
  handleModelChange: (modelId: string) => void
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

export function useModelManager() {
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID)

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId)
  }

  return {
    availableModels: AVAILABLE_MODELS,
    selectedModelId,
    handleModelChange,
  }
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const value = useModelManager()
  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
}

export function useModelContext() {
  const ctx = useContext(ModelContext)
  if (!ctx) {
    throw new Error("useModelContext must be used within a ModelProvider")
  }
  return ctx
}
