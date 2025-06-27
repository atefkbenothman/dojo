"use client"

import { ChatContent } from "@/components/chat/chat-content"
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable"
import { cn } from "@/lib/utils"
import { RefObject } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"

interface DesktopChatLayoutProps {
  // Panel configuration
  chatPanelRef: RefObject<ImperativePanelHandle | null>
  defaultSize: number
  isMaximized: boolean
  isChatPanelCollapsed: boolean
  
  // Panel constraints
  collapsedSize: number
  minSize: number
  maxSize: number
  
  // Callbacks
  onCollapse: () => void
  onExpand: () => void
  onMaximizeToggle: () => void
  onNewChat: () => void
  
  // Content props
  isServerHealthy: boolean
}

export function DesktopChatLayout({
  chatPanelRef,
  defaultSize,
  isMaximized,
  isChatPanelCollapsed,
  collapsedSize,
  minSize,
  maxSize,
  onCollapse,
  onExpand,
  onMaximizeToggle,
  onNewChat,
  isServerHealthy,
}: DesktopChatLayoutProps) {
  return (
    <>
      <ResizableHandle
        withHandle
        className={cn((isMaximized || isChatPanelCollapsed) && "hidden")}
        hitAreaMargins={{ coarse: 10, fine: 5 }}
      />
      
      <ResizablePanel
        id="chat-panel"
        ref={chatPanelRef}
        collapsible
        collapsedSize={collapsedSize}
        defaultSize={defaultSize}
        minSize={minSize}
        maxSize={maxSize}
        className="bg-card h-full w-full flex-shrink-0"
        onCollapse={onCollapse}
        onExpand={onExpand}
      >
        <ChatContent
          isCollapsed={isChatPanelCollapsed}
          isMaximized={isMaximized}
          onMaximizeToggle={onMaximizeToggle}
          onNewChat={onNewChat}
          isServerHealthy={isServerHealthy}
        />
      </ResizablePanel>
    </>
  )
}