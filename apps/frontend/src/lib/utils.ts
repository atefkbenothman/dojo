import { env } from "@/env"
import type { AIModel } from "@dojo/config"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retrieves an API Key for an ai chat model by checking
 * local storage first and then falling back to environment variables
 * if not found in local storage.
 */
export function getApiKeyForModel(model: AIModel): string | null {
  const localStorageKey = `${model.provider.toUpperCase()}_API_KEY`
  let apiKey = localStorage.getItem(localStorageKey)

  if (!apiKey) {
    const envJsKey = `NEXT_PUBLIC_${model.provider.toUpperCase()}_API_KEY` as keyof typeof env
    const envValue = env[envJsKey]
    if (envValue) {
      apiKey = envValue as string
    }
  }
  return apiKey
}
