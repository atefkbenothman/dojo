import { DEFAULT_MODEL_ID } from "@/lib/constants"
import { Id } from "@dojo/db/convex/_generated/dataModel"
import { create } from "zustand"

const modelStore = (defaultModelId: Id<"models">) =>
  create<{
    selectedModelId: Id<"models">
    setSelectedModelId: (id: Id<"models">) => void
  }>((set) => ({
    selectedModelId: defaultModelId,
    setSelectedModelId: (id) => set({ selectedModelId: id }),
  }))

export const useModelStore = modelStore(DEFAULT_MODEL_ID as Id<"models">)
