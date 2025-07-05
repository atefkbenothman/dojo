"use client"

import { useStableQuery } from "@/hooks/use-stable-query"
import { useModelStore } from "@/store/use-model-store"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { useCallback, useMemo } from "react"

export function useAIModels() {
  const selectedModelId = useModelStore((state) => state.selectedModelId)

  const models = useStableQuery(api.models.list)
  const modelsWithProviders = useStableQuery(api.models.modelsWithAvailability)
  const providers = useStableQuery(api.models.providers)

  const selectedModel = useMemo(() => {
    return models?.find((model) => model.modelId === selectedModelId)
  }, [models, selectedModelId])

  const getModel = useCallback(
    (modelId: Id<"models">) => {
      return models?.find((model) => model._id === modelId)
    },
    [models],
  )

  return {
    models: models || [],
    providers: providers || [],
    modelsWithProviders: modelsWithProviders || [],
    selectedModel,
    getModel,
  }
}
