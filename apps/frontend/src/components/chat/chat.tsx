"use client"

import { ChatFooter } from "@/components/chat/chat-footer"
import { Messages } from "@/components/chat/messages"
import { useRef, memo } from "react"

interface ChatProps {
  isServerHealthy: boolean
}

export const Chat = memo(function Chat({ isServerHealthy }: ChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!isServerHealthy) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="bg-muted text-muted-foreground border p-2 text-xs font-medium">Server is offline</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="no-scrollbar flex w-full flex-1 justify-center overflow-y-auto" ref={scrollRef}>
        <div className="w-full max-w-4xl">
          <Messages scrollRef={scrollRef} />
        </div>
      </div>
      <div className="flex w-full justify-center">
        <div className="w-full max-w-4xl">
          <ChatFooter />
        </div>
      </div>
    </div>
  )
})
