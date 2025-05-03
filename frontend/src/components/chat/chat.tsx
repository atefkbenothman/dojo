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
      <div className="flex flex-1 flex-col overflow-hidden">
        <Messages />
        <ChatFooter />
      </div>
    </div>
  )
}
