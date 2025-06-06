"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAIModels } from "@/hooks/use-ai-models"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUserContext } from "@/hooks/use-user-id"
import { successToastStyle } from "@/lib/styles"
import { Dispatch, SetStateAction, useMemo, useState } from "react"
import { toast } from "sonner"

function ApiKeyManager() {
  const { play } = useSoundEffectContext()
  const { providers, getApiKeyForProvider } = useAIModels()
  const { writeStorage, removeStorage } = useLocalStorage()

  const initialApiKeys = useMemo(() => {
    const keys: Record<string, string> = {}
    providers.forEach((provider) => {
      const keyValue = getApiKeyForProvider(provider.providerId)
      if (keyValue) {
        keys[provider.providerId] = keyValue
      }
    })
    return keys
  }, [providers, getApiKeyForProvider])

  const [apiKeys, setApiKeys] = useState<Record<string, string>>(initialApiKeys)

  function handleApiKeySave(provider: string) {
    const keyToSave = apiKeys[provider]
    const localStorageKey = `${provider.toUpperCase()}_API_KEY`
    if (keyToSave) {
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
      removeStorage(localStorageKey)
    }
  }

  return (
    <div className="space-y-6 py-4">
      {providers.map((provider) => (
        <div key={provider._id} className="space-y-2">
          <Label htmlFor={`api-key-${provider._id}`} className="capitalize">
            {provider.name}
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id={`api-key-${provider._id}`}
              type="password"
              value={apiKeys[provider.providerId] || ""}
              onChange={(e) => setApiKeys((prev) => ({ ...prev, [provider.providerId]: e.target.value }))}
              placeholder={`Enter your ${provider.name} API key`}
              className="flex-1 text-muted-foreground"
            />
            <Button
              onClick={() => handleApiKeySave(provider.providerId)}
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
  const { userId } = useUserContext()

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
              <UserIdManager userId={userId} />
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
