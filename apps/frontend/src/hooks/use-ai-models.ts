"use client"

import { useLocalStorage } from "./use-local-storage"
import { env } from "@/env"
import { useModelStore } from "@/store/use-model-store"
import { api } from "@dojo/db/convex/_generated/api"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { useQuery } from "convex/react"
import { useCallback, useMemo } from "react"

export function useAIModels() {
  const selectedModelId = useModelStore((state) => state.selectedModelId)

  const { readStorage } = useLocalStorage()

  const models = useQuery(api.models.list)
  const modelsWithProviders = useQuery(api.models.modelsWithProviders)
  const providers = useQuery(api.models.providers)

  const selectedModel = useMemo(() => {
    return models?.find((model) => model._id === selectedModelId)
  }, [models, selectedModelId])

  const getModel = useCallback(
    (modelId: Id<"models">) => {
      return models?.find((model) => model._id === modelId)
    },
    [models],
  )

  /*
   * Read api keys from localstorage and fallback to .env variables
   * if not found in localstorage
   */
  // const getApiKeyForProvider = useCallback(
  //   (providerId: string) => {
  //     const localStorageKey = `${providerId.toUpperCase()}_API_KEY`
  //     let apiKey = readStorage<string>(localStorageKey)
  //     if (!apiKey) {
  //       const envJsKey = `NEXT_PUBLIC_${providerId.toUpperCase()}_API_KEY` as keyof typeof env
  //       const envValue = env[envJsKey]
  //       if (envValue) {
  //         apiKey = envValue as string
  //       }
  //     }
  //     return apiKey
  //   },
  //   [readStorage],
  // )

  // const getApiKeyForModel = useCallback(
  //   (modelId: Id<"models">) => {
  //     const model = getModel(modelId)
  //     const providerId = model?.providerId
  //     const provider = providers?.find((p) => p._id === providerId)
  //     return getApiKeyForProvider(provider?.providerId || "")
  //   },
  //   [getModel, getApiKeyForProvider],
  // )

  return {
    models: models || [],
    modelsWithProviders: modelsWithProviders || [],
    selectedModel,
    providers: providers || [],
    getModel,
    // getApiKeyForModel,
    // getApiKeyForProvider,
  }
}
