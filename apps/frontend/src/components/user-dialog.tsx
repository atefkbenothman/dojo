"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAIModels } from "@/hooks/use-ai-models"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { successToastStyle } from "@/lib/styles"
import { api } from "@dojo/db/convex/_generated/api"
import { useQuery } from "convex/react"
import { Eye, EyeOff } from "lucide-react"
import { Dispatch, SetStateAction, useState } from "react"
import React from "react"
import { toast } from "sonner"

function ApiKeyManager() {
  const { play } = useSoundEffectContext()
  const { providers } = useAIModels()

  const user = useQuery(api.user.currentUser)
  const userApiKeys = useQuery(api.apiKeys.getApiKeysForUser, user && user._id ? { userId: user._id } : "skip") || []

  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})

  if (user === undefined) return null

  if (user === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-center text-muted-foreground">Login to save your API key</p>
      </div>
    )
  }

  const toggleVisibility = (providerId: string) => {
    setVisibleKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  return (
    <div className="space-y-6 py-4">
      {providers.map((provider) => (
        <div key={provider._id} className="space-y-2">
          <Label htmlFor={`api-key-${provider._id}`} className="capitalize">
            {provider.name}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`api-key-${provider._id}`}
              type={visibleKeys[provider._id] ? "text" : "password"}
              value={userApiKeys.find((key) => key.providerId === provider._id)?.apiKey || ""}
              onChange={(e) => {
                console.log(e.target.value)
              }}
              // onChange={(e) => setApiKeys((prev) => ({ ...prev, [provider.providerId]: e.target.value }))}
              className="flex-1 text-muted-foreground"
            />
            <Button
              size="icon"
              variant="outline"
              className="hover:cursor-pointer"
              onClick={() => toggleVisibility(provider._id)}
            >
              {visibleKeys[provider._id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
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

function UserIdManager() {
  const user = useQuery(api.user.currentUser)
  if (user === undefined) return null
  if (user === null) return <p>Anonymous</p>
  return (
    <div className="flex flex-col items-center py-6 gap-3 h-full items-center justify-center">
      <img
        src={user.image || "/default-avatar.png"}
        alt="User avatar"
        className="w-20 h-20 rounded-full border object-cover bg-muted shadow"
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = "/default-avatar.png"
        }}
      />
      <div className="flex flex-col items-center gap-1 mt-2">
        <span className="text-lg font-semibold text-foreground">{user.name}</span>
        <span className="text-sm text-muted-foreground break-all">{user.email}</span>
      </div>
    </div>
  )
}

interface UserDialogProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export function UserDialog({ isOpen, setIsOpen }: UserDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="h-120 flex flex-col border-2">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="user" className="w-full flex-1 flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="user">User</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto py-2 px-1">
            <TabsContent value="user" className="h-full">
              <UserIdManager />
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
