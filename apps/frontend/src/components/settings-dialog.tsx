"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { env } from "@/env"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useModelContext } from "@/hooks/use-model"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUserContext } from "@/hooks/use-user-id"
import type { ProviderId } from "@dojo/config"
import { SettingsIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

function ApiKeyManager() {
  const { models } = useModelContext()
  const { readStorage, writeStorage, removeStorage } = useLocalStorage()

  const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>({} as Record<ProviderId, string>)

  const providers = useMemo(() => {
    const uniqueProviders = new Set<ProviderId>()
    models.forEach((model) => uniqueProviders.add(model.provider))
    return Array.from(uniqueProviders)
  }, [models])

  useEffect(() => {
    const initialApiKeys: Record<ProviderId, string> = {} as Record<ProviderId, string>
    providers.forEach((provider) => {
      const localStorageKey = `${provider.toUpperCase()}_API_KEY`
      const envJsKey = `NEXT_PUBLIC_${provider.toUpperCase()}_API_KEY` as keyof typeof env

      let keyValue = readStorage<string>(localStorageKey)

      if (!keyValue) {
        const envValue = env[envJsKey as keyof typeof env]
        if (typeof envValue === "string") {
          keyValue = envValue
        }
      }

      if (keyValue) {
        initialApiKeys[provider] = keyValue
      }
    })
    setApiKeys(initialApiKeys)
  }, [providers, readStorage])

  const handleApiKeyChange = (provider: ProviderId, value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }))
  }

  const handleSaveApiKey = (provider: ProviderId) => {
    const keyToSave = apiKeys[provider]
    if (keyToSave) {
      const localStorageKey = `${provider.toUpperCase()}_API_KEY`
      writeStorage<string>(localStorageKey, keyToSave)
    } else {
      const localStorageKey = `${provider.toUpperCase()}_API_KEY`
      removeStorage(localStorageKey)
    }
  }

  return (
    <div className="space-y-4 py-4">
      {providers.map((provider) => (
        <div key={provider} className="space-y-2">
          <Label htmlFor={`api-key-${provider}`} className="capitalize">
            {provider}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`api-key-${provider}`}
              type="password"
              value={apiKeys[provider] || ""}
              onChange={(e) => handleApiKeyChange(provider, e.target.value)}
              placeholder={`Enter your ${provider} API key`}
              className="flex-1"
            />
            <Button onClick={() => handleSaveApiKey(provider)} size="default" className="hover:cursor-pointer">
              Save
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SettingsDialog() {
  const userId = useUserContext()

  const [isOpen, setIsOpen] = useState(false)

  const { play } = useSoundEffectContext()

  const handleMouseDown = () => {
    play("./click.mp3", { volume: 0.5 })
    setIsOpen(true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" className="hover:cursor-pointer" onMouseDown={handleMouseDown}>
          <SettingsIcon className="h-4.5 w-4.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>User ID: {userId}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="api-keys" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 border">
            <TabsTrigger value="api-keys" onMouseDown={() => play("./click.mp3", { volume: 0.5 })}>
              API Keys
            </TabsTrigger>
            <TabsTrigger value="other" onMouseDown={() => play("./click.mp3", { volume: 0.5 })}>
              Other
            </TabsTrigger>
          </TabsList>
          <TabsContent value="api-keys">
            <ApiKeyManager />
          </TabsContent>
          <TabsContent value="other"></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
