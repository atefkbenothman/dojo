"use client"

import { ChatFooter } from "@/components/chat/chat-footer"
import { MessageList } from "@/components/chat/messages"

export function Chat() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessageList />
        <ChatFooter />
      </div>
    </div>
  )
}
