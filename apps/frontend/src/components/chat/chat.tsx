"use client"

import { ChatFooter } from "@/components/chat/chat-footer"
import { Messages } from "@/components/chat/messages"
import { useUserContext } from "@/hooks/use-user-id"
import { useRef } from "react"

export function Chat() {
  const { backendHealth } = useUserContext()
  const scrollRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>

  if (backendHealth === "unhealthy") {
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
}
