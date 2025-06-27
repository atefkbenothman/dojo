"use client"

import { Chat } from "@/components/chat/chat"
import { ChatPanelHeader } from "@/components/panels/chat-panel-header"
import { useLayout } from "@/hooks/use-layout"
import { cn } from "@/lib/utils"
import { useState } from "react"

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
  const { isMobile, isMobileChatOpen, setIsMobileChatOpen } = useLayout()

  // Mobile chat toggle handler
  const handleMobileChatToggle = () => {
    setIsMobileChatOpen(!isMobileChatOpen)
  }

  // For mobile, we need to handle the visibility differently
  const shouldShowChat = isMobile ? isMobileChatOpen : !isCollapsed

  return (
    <div className={cn(
      "flex h-full w-full flex-col",
      // Mobile: Only show when open, desktop: always show
      isMobile && !isMobileChatOpen && "hidden",
      className
    )}>
      <ChatPanelHeader
        isCollapsed={isCollapsed && !isMobile}
        isMaximized={isMaximized}
        onMaximizeToggle={isMobile ? handleMobileChatToggle : onMaximizeToggle}
        onNewChat={onNewChat}
      />
      {shouldShowChat ? (
        <div className={cn("flex flex-1 flex-col overflow-hidden p-2", isMaximized && "mx-auto flex w-full")}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Chat isServerHealthy={isServerHealthy} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center" />
      )}
    </div>
  )
}