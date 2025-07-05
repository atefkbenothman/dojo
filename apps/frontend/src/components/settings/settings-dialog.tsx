"use client"

import { ApiKeyManager } from "@/components/settings/api-key-manager"
import { SignInCard } from "@/components/settings/sign-in-card"
import { UserManager } from "@/components/settings/user-manager"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAIModels } from "@/hooks/use-ai-models"
import { useAuth } from "@/hooks/use-auth"
import { useAuthActions } from "@convex-dev/auth/react"
import { Dispatch, SetStateAction, memo } from "react"

interface UserDialogProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export const SettingsDialog = memo(function SettingsDialog({ isOpen, setIsOpen }: UserDialogProps) {
  const { providers } = useAIModels()
  const { user, userApiKeys } = useAuth()
  const { signIn } = useAuthActions()

  if (!isOpen) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl h-[40rem] flex flex-col border-2 overflow-hidden p-0 m-0 gap-0">
        <DialogHeader className="p-0 gap-0 m-0 h-12 flex justify-center p-4 border-b-[2px] bg-card">
          <DialogTitle className="text-base font-semibold">Settings</DialogTitle>
        </DialogHeader>
        {user === undefined ? (
          // Loading state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : user === null ? (
          // Not authenticated - show sign in card
          <div className="flex-1 flex items-center justify-center p-4">
            <SignInCard
              description="Please sign in to access your settings and manage your account."
              onSignIn={() => void signIn("github", { redirectTo: window.location.pathname })}
            />
          </div>
        ) : (
          // Authenticated - show tabs
          <Tabs defaultValue="user" className="w-full flex-1 flex flex-col h-full p-4 gap-0">
            <TabsList className="grid w-full grid-cols-3 h-12">
              <TabsTrigger value="user">User</TabsTrigger>
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>
            <TabsContent value="user" className="flex-1">
              <UserManager user={user} />
            </TabsContent>
            <TabsContent value="api-keys" className="flex-1 overflow-y-auto py-4 px-1 min-h-0">
              <ApiKeyManager user={user} userApiKeys={userApiKeys} providers={providers} />
            </TabsContent>
            <TabsContent value="other"></TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
})
