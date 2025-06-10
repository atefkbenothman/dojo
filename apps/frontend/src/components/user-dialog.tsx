"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAIModels } from "@/hooks/use-ai-models"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUser } from "@/hooks/use-user"
import { errorToastStyle, successToastStyle } from "@/lib/styles"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { Eye, EyeOff } from "lucide-react"
import { Dispatch, SetStateAction, useState, useEffect } from "react"
import React from "react"
import { toast } from "sonner"

interface ApiKeyManagerProps {
  user: Doc<"users"> | null | undefined
  userApiKeys: Doc<"apiKeys">[]
  providers: Doc<"providers">[]
  upsertApiKey: (variables: {
    apiKey: string
    userId: Id<"users">
    providerId: Id<"providers">
  }) => Promise<Id<"apiKeys">>
  removeApiKey: (variables: { userId: Id<"users">; providerId: Id<"providers"> }) => Promise<Id<"apiKeys"> | null>
}

function ApiKeyManager({ user, userApiKeys, providers, upsertApiKey, removeApiKey }: ApiKeyManagerProps) {
  const { play } = useSoundEffectContext()

  const [visibleKeys, setVisibleKeys] = useState<Record<Id<"providers">, boolean>>({})
  const [inputValues, setInputValues] = useState<Record<Id<"providers">, string>>({})

  useEffect(() => {
    if (userApiKeys && providers) {
      setInputValues((prev) => {
        const updated: Record<Id<"providers">, string> = { ...prev }
        providers.forEach((provider) => {
          const found = userApiKeys.find((key) => key.providerId === provider._id)
          if (found && updated[provider._id] === undefined) {
            updated[provider._id] = found.apiKey
          }
        })
        return updated
      })
    }
  }, [userApiKeys, providers])

  if (user === undefined) return null

  if (user === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-center text-muted-foreground">Login to save your API key</p>
      </div>
    )
  }

  const toggleVisibility = (providerId: Id<"providers">) => {
    setVisibleKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  const handleInputChange = (providerId: Id<"providers">, value: string) => {
    setInputValues((prev) => ({ ...prev, [providerId]: value }))
  }

  const handleSave = async (providerId: Id<"providers">) => {
    const apiKey = inputValues[providerId]
    // Remove api key from convex if empty
    if (!apiKey) {
      const result = await removeApiKey({ userId: user!._id, providerId })
      if (result) {
        toast.error("API key removed", {
          icon: null,
          id: "api-key-removed",
          duration: 5000,
          position: "bottom-center",
          style: errorToastStyle,
        })
        setTimeout(() => {
          play("./sounds/delete.mp3", { volume: 0.5 })
        }, 100)
      }
      return
    }

    await upsertApiKey({ apiKey, userId: user!._id, providerId })
    toast.success("API keys saved to database", {
      icon: null,
      id: "api-key-saved",
      duration: 5000,
      position: "bottom-center",
      style: successToastStyle,
    })
    setTimeout(() => {
      play("./sounds/save.mp3", { volume: 0.5 })
    }, 100)
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
              value={inputValues[provider._id] ?? ""}
              onChange={(e) => handleInputChange(provider._id, e.target.value)}
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
              onClick={() => handleSave(provider._id)}
            >
              Save
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

interface UserIdManagerProps {
  user: Doc<"users"> | null | undefined
  deleteUserMutation: (variables: { id: Id<"users"> }) => Promise<null>
}

function UserIdManager({ user, deleteUserMutation }: UserIdManagerProps) {
  if (user === undefined) return null
  if (user === null) return <p>Anonymous</p>

  const handleDeleteAccount = async () => {
    if (user) {
      await deleteUserMutation({ id: user._id })
      toast.success("Your account has been deleted.", {
        icon: null,
        id: "account-deleted",
        duration: 5000,
        position: "bottom-center",
        style: successToastStyle,
      })
    }
  }

  return (
    <div className="flex flex-col items-center py-6 gap-3 h-full justify-center">
      <img src={user.image} alt="User avatar" className="w-20 h-20 border object-cover bg-muted shadow" />
      <div className="flex flex-col items-center gap-1 mt-2">
        <span className="text-lg font-semibold text-foreground">{user.name}</span>
        <span className="text-sm text-muted-foreground break-all">{user.email}</span>
      </div>
      <div className="mt-auto pt-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="hover:cursor-pointer">
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove your data from our
                servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="hover:cursor-pointer">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="hover:cursor-pointer">
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

interface UserDialogProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export function UserDialog({ isOpen, setIsOpen }: UserDialogProps) {
  const { providers } = useAIModels()
  const { user, userApiKeys } = useUser()
  const deleteUserMutation = useMutation(api.user.deleteUser)
  const upsertApiKey = useMutation(api.apiKeys.upsertApiKey)
  const removeApiKey = useMutation(api.apiKeys.removeApiKey)

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
              <UserIdManager user={user} deleteUserMutation={deleteUserMutation} />
            </TabsContent>
            <TabsContent value="api-keys">
              <ApiKeyManager
                user={user}
                userApiKeys={userApiKeys}
                providers={providers}
                upsertApiKey={upsertApiKey}
                removeApiKey={removeApiKey}
              />
            </TabsContent>
            <TabsContent value="other"></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
