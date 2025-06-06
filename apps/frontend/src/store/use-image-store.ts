import { create } from "zustand"

interface ImageStoreState {
  isImageGenerating: boolean
  setIsImageGenerating: (isGenerating: boolean) => void
}

export const useImageStore = create<ImageStoreState>((set) => ({
  isImageGenerating: false,
  setIsImageGenerating: (isGenerating) => set({ isImageGenerating: isGenerating }),
}))
