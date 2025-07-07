"use client"

import { ChatContent } from "@/components/chat/chat-content"
import { MainPanelHeader } from "@/components/panels/main-panel-header"
import { SideNav } from "@/components/panels/side-nav"
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable"
import { useChat } from "@/hooks/use-chat"
import { useResizableChatPanel } from "@/hooks/use-resizable-chat-panel"
import { useNotificationStore } from "@/store/use-notification-store"
import { cn } from "@/lib/utils"
import { useRef, useCallback, useEffect } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"

interface ResizableLayoutProps {
  children: React.ReactNode
  defaultLayout: number[]
  isServerHealthy: boolean
}

// Panel size constants
const CHAT_PANEL_COLLAPSED_SIZE_PERCENTAGE = 0
const CHAT_PANEL_EXPANDED_WIDTH_PERCENTAGE = 30
const CHAT_PANEL_MIN_SIZE_PERCENTAGE = 20
const CHAT_PANEL_MAX_SIZE_PERCENTAGE = 60

export function ResizableLayout({ children, defaultLayout, isServerHealthy }: ResizableLayoutProps) {
  const { handleNewChat, clearNotifications } = useChat()
  const { hasUnreadMessages, clearAllNotifications } = useNotificationStore()

  const chatPanelRef = useRef<ImperativePanelHandle>(null)

  // Desktop chat panel hook - only used for desktop
  const {
    isChatPanelCollapsed,
    isMaximized,
    handleChatPanelToggle: desktopHandleChatPanelToggle,
    handleMaximizeToggle,
    syncPanelCollapsedState,
  } = useResizableChatPanel({
    chatPanelRef: chatPanelRef,
    config: {
      defaultSizePercentage: defaultLayout[1] ?? 30,
      expandedWidthPercentage: CHAT_PANEL_EXPANDED_WIDTH_PERCENTAGE,
      collapsedSizePercentage: CHAT_PANEL_COLLAPSED_SIZE_PERCENTAGE,
    },
    initialIsMaximized: Math.round(defaultLayout[1] ?? 30) === 100,
  })

  const onLayout = useCallback((sizes: number[]) => {
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
  }, [])

  const onCollapse = useCallback(() => {
    syncPanelCollapsedState(true)
  }, [syncPanelCollapsedState])

  const onExpand = useCallback(() => {
    syncPanelCollapsedState(false)
  }, [syncPanelCollapsedState])

  // Clear notifications when panel opens
  useEffect(() => {
    if (!isChatPanelCollapsed && hasUnreadMessages) {
      clearNotifications()
      clearAllNotifications()
    }
  }, [isChatPanelCollapsed, hasUnreadMessages, clearNotifications, clearAllNotifications])

  // Chat panel toggle - same behavior for all screen sizes
  const onChatPanelToggle = useCallback(() => {
    desktopHandleChatPanelToggle()
  }, [desktopHandleChatPanelToggle])

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col md:flex-row">
      {/* Mobile: Header and nav at top level for correct ordering */}
      <div className="md:hidden">
        <MainPanelHeader onChatPanelToggle={onChatPanelToggle} hasUnreadMessages={hasUnreadMessages} />
        <SideNav />
      </div>

      {/* Desktop: SideNav on the left */}
      <div className="hidden md:block">
        <SideNav />
      </div>

      {/* Main content area - Always same structure for all screen sizes */}
      <ResizablePanelGroup direction="horizontal" onLayout={onLayout} className="flex-1 overflow-hidden">
        {/* Main Panel - Always rendered */}
        <ResizablePanel defaultSize={defaultLayout[0]} className={cn(isMaximized && "hidden")}>
          <div className="flex h-full flex-col">
            {/* Desktop: Header inside panel (original working structure) */}
            <div className="hidden md:block">
              <MainPanelHeader onChatPanelToggle={onChatPanelToggle} hasUnreadMessages={hasUnreadMessages} />
            </div>
            <div className="flex-1 overflow-auto min-w-[calc(100vw-42px)]">{children}</div>
          </div>
        </ResizablePanel>

        {/* Resizable Handle */}
        <ResizableHandle
          withHandle
          className={cn((isMaximized || isChatPanelCollapsed) && "hidden")}
          hitAreaMargins={{ coarse: 10, fine: 5 }}
        />

        {/* Chat Panel - Same behavior for all screen sizes */}
        <ResizablePanel
          id="chat-panel"
          ref={chatPanelRef}
          collapsible
          collapsedSize={CHAT_PANEL_COLLAPSED_SIZE_PERCENTAGE}
          defaultSize={defaultLayout[1] ?? 30}
          minSize={CHAT_PANEL_MIN_SIZE_PERCENTAGE}
          maxSize={CHAT_PANEL_MAX_SIZE_PERCENTAGE}
          className="bg-card h-full w-full flex-shrink-0"
          onCollapse={onCollapse}
          onExpand={onExpand}
        >
          <ChatContent
            isCollapsed={isChatPanelCollapsed}
            isMaximized={isMaximized}
            onMaximizeToggle={handleMaximizeToggle}
            onNewChat={handleNewChat}
            isServerHealthy={isServerHealthy}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
