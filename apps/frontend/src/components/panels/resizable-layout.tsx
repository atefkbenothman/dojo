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
  const { isMobile } = useLayout()

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

  // Chat panel toggle - same behavior for all screen sizes
  const onChatPanelToggle = useCallback(() => {
    desktopHandleChatPanelToggle()
  }, [desktopHandleChatPanelToggle])

  return (
    <div className={cn(
      "h-[100dvh] w-screen overflow-hidden",
      isMobile ? "flex flex-col" : "flex"
    )}>
      {/* Header - always rendered, positioned via CSS */}
      <MainPanelHeader 
        onChatPanelToggle={onChatPanelToggle} 
        isCollapsed={isChatPanelCollapsed}
        className={cn(
          // Desktop: Absolute positioned over content
          !isMobile && "absolute top-0 left-[42px] right-0 z-10",
          // Mobile: Normal flow, appears first
          isMobile && "relative"
        )}
      />

      {/* SideNav - always rendered, positioned via CSS */}
      <SideNav className={cn(
        // Desktop: Normal position on left
        !isMobile && "relative",
        // Mobile: Appears second in flow
        isMobile && "relative"
      )} />

      {/* Main content area - Always same structure for all screen sizes */}
      <ResizablePanelGroup 
        direction="horizontal" 
        onLayout={onLayout}
        className="flex-1 overflow-hidden"
      >
        {/* Main Panel - Always rendered */}
        <ResizablePanel 
          defaultSize={defaultLayout[0]} 
          className={cn(isMaximized && "hidden")}
        >
          <div className={cn(
            "flex h-full flex-col",
            // Add top padding for header on desktop
            !isMobile && "pt-[42px]"
          )}>
            <div className="flex-1 overflow-auto md:min-w-[500px]">
              {children}
            </div>
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
