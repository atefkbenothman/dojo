"use client"

import { Chat } from "@/components/chat/chat"
import { ChatPanelHeader } from "@/components/panels/chat-panel-header"
import { cn } from "@/lib/utils"

interface ChatContentProps {
  isCollapsed: boolean
  isMaximized: boolean
  onMaximizeToggle: () => void
  onNewChat: () => void
  isServerHealthy: boolean
  className?: string
}

export function ChatContent({
  isCollapsed,
  isMaximized,
  onMaximizeToggle,
  onNewChat,
  isServerHealthy,
  className,
}: ChatContentProps) {
  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      <ChatPanelHeader
        isCollapsed={isCollapsed}
        isMaximized={isMaximized}
        onMaximizeToggle={onMaximizeToggle}
        onNewChat={onNewChat}
      />
      {isCollapsed ? (
        <div className="flex flex-1 items-center justify-center" />
      ) : (
        <div className={cn("flex flex-1 flex-col overflow-hidden p-2", isMaximized && "mx-auto flex w-full")}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Chat isServerHealthy={isServerHealthy} />
          </div>
        </div>
      )}
    </div>
  )
}
