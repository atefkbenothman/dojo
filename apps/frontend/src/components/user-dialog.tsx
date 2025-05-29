"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { env } from "@/env"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useModelContext } from "@/hooks/use-model"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUserContext } from "@/hooks/use-user-id"
import { successToastStyle } from "@/lib/styles"
import type { ProviderId } from "@dojo/config"
import { useEffect, useMemo, useState, Dispatch, SetStateAction } from "react"
import { toast } from "sonner"

function ApiKeyManager() {
  const { play } = useSoundEffectContext()
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
      toast.success(`${provider.toUpperCase()} API key saved to localstorage`, {
        icon: null,
        id: "api-key-saved",
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
      setTimeout(() => {
        play("./sounds/save.mp3", { volume: 0.5 })
      }, 100)
    } else {
      const localStorageKey = `${provider.toUpperCase()}_API_KEY`
      removeStorage(localStorageKey)
    }
  }

  return (
    <div className="space-y-6 py-4">
      {providers.map((provider) => (
        <div key={provider} className="space-y-2">
          <Label htmlFor={`api-key-${provider}`} className="capitalize">
            {provider}
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id={`api-key-${provider}`}
              type="password"
              value={apiKeys[provider] || ""}
              onChange={(e) => handleApiKeyChange(provider, e.target.value)}
              placeholder={`Enter your ${provider} API key`}
              className="flex-1 text-muted-foreground"
            />
            <Button
              onClick={() => handleSaveApiKey(provider)}
              size="default"
              variant="secondary"
              className="hover:cursor-pointer border bg-secondary/80 hover:bg-secondary/90"
            >
              Save
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function UserIdManager({ userId }: { userId: string }) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>User ID</Label>
        <div className="text-sm font-mono break-all text-muted-foreground p-1">{userId}</div>
      </div>
    </div>
  )
}

interface UserDialogProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export function UserDialog({ isOpen, setIsOpen }: UserDialogProps) {
  const userId = useUserContext()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="h-120 flex flex-col border-2">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="user" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="user">User</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto py-2 px-1">
            <TabsContent value="user">
              <UserIdManager userId={userId ?? ""} />
            </TabsContent>
            <TabsContent value="api-keys">
              <ApiKeyManager />
            </TabsContent>
            <TabsContent value="other"></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
