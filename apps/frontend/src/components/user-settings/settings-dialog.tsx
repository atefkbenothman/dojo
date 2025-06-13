"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiKeyManager } from "@/components/user-settings/api-key-manager"
import { UserManager } from "@/components/user-settings/user-manager"
import { useAIModels } from "@/hooks/use-ai-models"
import { useUser } from "@/hooks/use-user"
import { Dispatch, SetStateAction } from "react"

interface UserDialogProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export function SettingsDialog({ isOpen, setIsOpen }: UserDialogProps) {
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
            <UserManager user={user} />
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
