import { env } from "@/env"
import { MCPServerConfig } from "@dojo/config/src/types"
import { MCPServer } from "@dojo/config/src/types"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiKey(keyName: string): string | undefined {
  const lookupKey = `NEXT_PUBLIC_${keyName}`
  if (lookupKey in env) {
    return env[lookupKey as keyof typeof env] as string | undefined
  }
  return undefined
}

export function getServerConfigWithEnv(server: MCPServer, overrides?: Partial<MCPServerConfig>): MCPServerConfig {
  const requiredKeys = server.config?.requiresEnv || []
  const envMap: Record<string, string> = {}

  requiredKeys.forEach((keyName) => {
    let localStorageValue: string | null = null
    if (typeof window !== "undefined") {
      try {
        const item = window.localStorage.getItem(keyName)
        localStorageValue = item
      } catch (error) {
        console.error(`Error reading localStorage key "${keyName}":`, error)
      }
    }

    if (localStorageValue && localStorageValue.trim() !== "") {
      envMap[keyName] = localStorageValue
    } else {
      const apiKey = getApiKey(keyName)
      if (apiKey && apiKey.trim() !== "") {
        envMap[keyName] = apiKey
      }
    }
  })

  return {
    command: overrides?.command ?? server.config?.command ?? "",
    args: overrides?.args ?? server.config?.args ?? [],
    env: Object.keys(envMap).length > 0 ? envMap : undefined,
    ...overrides,
  }
}
