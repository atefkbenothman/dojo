import { DEFAULT_MODEL_ID } from "@/lib/constants"
import { create } from "zustand"

const modelStore = (defaultModelId: string) =>
  create<{
    selectedModelId: string
    setSelectedModelId: (id: string) => void
  }>((set) => ({
    selectedModelId: defaultModelId,
    setSelectedModelId: (id) => set({ selectedModelId: id }),
  }))

export const useModelStore = modelStore(DEFAULT_MODEL_ID)
