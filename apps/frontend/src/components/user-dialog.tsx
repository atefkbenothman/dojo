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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAIModels } from "@/hooks/use-ai-models"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { useUser } from "@/hooks/use-user"
import { errorToastStyle, successToastStyle } from "@/lib/styles"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@dojo/db/convex/_generated/api"
import { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import { useMutation } from "convex/react"
import { Eye, EyeOff, TriangleAlert } from "lucide-react"
import { Dispatch, SetStateAction, useState, useEffect } from "react"
import React from "react"
import { toast } from "sonner"

interface ApiKeyManagerProps {
  user: Doc<"users"> | null | undefined
  userApiKeys: Doc<"apiKeys">[]
  providers: Doc<"providers">[]
}

function ApiKeyManager({ user, userApiKeys, providers }: ApiKeyManagerProps) {
  const { play } = useSoundEffectContext()
  const { signIn } = useAuthActions()
  const upsertApiKey = useMutation(api.apiKeys.upsertApiKey)
  const removeApiKey = useMutation(api.apiKeys.removeApiKey)

  const [visibleKeys, setVisibleKeys] = useState<Record<Id<"providers">, boolean>>({})
  const [inputValues, setInputValues] = useState<Record<Id<"providers">, string>>({})
  const [savingState, setSavingState] = useState<Record<Id<"providers">, "idle" | "saving">>({})

  useEffect(() => {
    if (userApiKeys && providers) {
      const initialInputValues: Record<Id<"providers">, string> = {}
      providers.forEach((provider) => {
        const found = userApiKeys.find((key) => key.providerId === provider._id)
        initialInputValues[provider._id] = found?.apiKey || ""
      })
      setInputValues(initialInputValues)
    }
  }, [userApiKeys, providers])

  if (user === undefined) return null

  if (user === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Sign In to Continue</CardTitle>
            <CardDescription>Please sign in to manage and save your API keys securely.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full hover:cursor-pointer"
              onClick={() => void signIn("github", { redirectTo: window.location.pathname })}
            >
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const toggleVisibility = (providerId: Id<"providers">) => {
    setVisibleKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  const handleInputChange = (providerId: Id<"providers">, value: string) => {
    setInputValues((prev) => ({ ...prev, [providerId]: value }))
    setSavingState((prev) => ({ ...prev, [providerId]: "idle" }))
  }

  const handleSave = async (providerId: Id<"providers">) => {
    setSavingState((prev) => ({ ...prev, [providerId]: "saving" }))
    const apiKey = inputValues[providerId]

    try {
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
      } else {
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
    } catch (error) {
      console.error(error)
    } finally {
      setSavingState((prev) => ({ ...prev, [providerId]: "idle" }))
    }
  }

  const isDirty = (providerId: Id<"providers">) => {
    if (inputValues[providerId] === undefined) {
      return false
    }
    const originalKey = userApiKeys.find((key) => key.providerId === providerId)?.apiKey || ""
    return inputValues[providerId] !== originalKey
  }

  return (
    <div className="space-y-4 pb-4">
      {providers.map((provider) => (
        <Card key={provider._id}>
          <CardHeader>
            <CardTitle className="capitalize">{provider.name}</CardTitle>
          </CardHeader>
          <CardContent>
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
            </div>
          </CardContent>
          <CardFooter className="flex justify-end items-center">
            <Button
              size="default"
              variant={savingState[provider._id] === "saving" || isDirty(provider._id) ? "default" : "secondary"}
              className="hover:cursor-pointer"
              onClick={() => handleSave(provider._id)}
              disabled={savingState[provider._id] === "saving" || !isDirty(provider._id)}
            >
              {savingState[provider._id] === "saving" ? "Saving..." : "Save"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

interface UserIdManagerProps {
  user: Doc<"users"> | null | undefined
}

function UserIdManager({ user }: UserIdManagerProps) {
  const deleteUserMutation = useMutation(api.user.deleteUser)
  const { signIn, signOut } = useAuthActions()
  if (user === undefined) return null
  if (user === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Sign In to Continue</CardTitle>
            <CardDescription>Sign in to see your user information and manage your account.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full hover:cursor-pointer"
              onClick={() => void signIn("github", { redirectTo: window.location.pathname })}
            >
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

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
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-row items-center gap-4">
          <img src={user.image} alt="User avatar" className="h-16 w-16 rounded-full border object-cover" />
          <div className="flex flex-col">
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" className="hover:cursor-pointer" onClick={() => void signOut()}>
            Sign Out
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="hover:cursor-pointer">
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 text-destructive" />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove your data from our
                  servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="hover:cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="hover:cursor-pointer bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
                >
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl h-[40rem] flex flex-col border-2 overflow-hidden">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="user" className="w-full flex-1 flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="user">User</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
          <TabsContent value="user" className="flex-1 py-2 px-1">
            <UserIdManager user={user} />
          </TabsContent>
          <TabsContent value="api-keys" className="flex-1 overflow-y-auto py-4 px-1 min-h-0">
            <ApiKeyManager user={user} userApiKeys={userApiKeys} providers={providers} />
          </TabsContent>
          <TabsContent value="other"></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
