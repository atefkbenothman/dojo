"use client"

import { ChatFooter } from "@/components/chat/chat-footer"
import { Messages } from "@/components/chat/messages"
import { useConnectionContext } from "@/hooks/use-connection"

export function Chat() {
  const { isServerHealthy } = useConnectionContext()

  if (!isServerHealthy) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">Connect to server first</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex w-full flex-1 justify-center overflow-y-auto">
        <div className="w-full max-w-4xl">
          <Messages />
        </div>
      </div>
      <div className="flex w-full justify-center">
        <div className="w-full max-w-4xl">
          <ChatFooter />
        </div>
      </div>
    </div>
  )
}
