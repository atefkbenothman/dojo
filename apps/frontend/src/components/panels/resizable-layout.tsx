"use client"

import { ChatContent } from "@/components/chat/chat-content"
import { MainPanelHeader } from "@/components/panels/main-panel-header"
import { SideNav } from "@/components/panels/side-nav"
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable"
import { useChatProvider } from "@/hooks/use-chat"
import { useLayout } from "@/hooks/use-layout"
import { useResizableChatPanel } from "@/hooks/use-resizable-chat-panel"
import { cn } from "@/lib/utils"
import { useRef, useCallback } from "react"
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
  const { handleNewChat } = useChatProvider()
  const { isMobile, setIsMobileChatOpen } = useLayout()

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

  // Chat panel toggle - different behavior for mobile/desktop
  const onChatPanelToggle = useCallback(() => {
    if (isMobile) {
      setIsMobileChatOpen(true)
    } else {
      desktopHandleChatPanelToggle()
    }
  }, [isMobile, setIsMobileChatOpen, desktopHandleChatPanelToggle])

  return (
    <div className={cn(
      "h-[100dvh] w-screen overflow-hidden",
      isMobile ? "flex flex-col" : "flex"
    )}>
      {/* SideNav - always rendered, positioned differently based on layout */}
      <SideNav />

      {/* Main content area */}
      <div className={cn(
        "flex-1 overflow-hidden",
        isMobile ? "flex flex-col" : "flex"
      )}>
        {/* Desktop: Resizable layout, Mobile: Simple layout */}
        {isMobile ? (
          <>
            <MainPanelHeader onChatPanelToggle={onChatPanelToggle} isCollapsed={isChatPanelCollapsed} />
            <div className="flex-1 overflow-auto">{children}</div>
          </>
        ) : (
          <ResizablePanelGroup direction="horizontal" onLayout={onLayout}>
            {/* Main Panel */}
            <ResizablePanel defaultSize={defaultLayout[0]} className={cn(isMaximized && "hidden")}>
              <div className="flex h-full flex-col">
                <MainPanelHeader onChatPanelToggle={onChatPanelToggle} isCollapsed={isChatPanelCollapsed} />
                <div className="flex-1 overflow-auto md:min-w-[500px]">{children}</div>
              </div>
            </ResizablePanel>

            {/* Desktop Chat Panel */}
            <ResizableHandle
              withHandle
              className={cn((isMaximized || isChatPanelCollapsed) && "hidden")}
              hitAreaMargins={{ coarse: 10, fine: 5 }}
            />
            
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
        )}
      </div>

      {/* Chat Panel - Mobile overlay, always rendered but positioned/styled differently */}
      <ChatContent
        isCollapsed={false}
        isMaximized={true}
        onMaximizeToggle={() => {}} // Mobile close handled within ChatContent
        onNewChat={handleNewChat}
        isServerHealthy={isServerHealthy}
        className={cn(
          isMobile ? "fixed inset-0 z-[100] bg-background" : "hidden"
        )}
      />
    </div>
  )
}
