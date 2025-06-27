"use client"

import { ChatContent } from "@/components/chat/chat-content"

interface MobileChatLayoutProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
  isServerHealthy: boolean
}

export function MobileChatLayout({ isOpen, onClose, onNewChat, isServerHealthy }: MobileChatLayoutProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      <ChatContent
        isCollapsed={false}
        isMaximized={true}
        onMaximizeToggle={onClose}
        onNewChat={onNewChat}
        isServerHealthy={isServerHealthy}
      />
    </div>
  )
}
