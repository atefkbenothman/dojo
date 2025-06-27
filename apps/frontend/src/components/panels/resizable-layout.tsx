"use client"

import { DesktopChatLayout } from "@/components/chat/desktop-chat-layout"
import { MobileChatLayout } from "@/components/chat/mobile-chat-layout"
import { MainPanelHeader } from "@/components/panels/main-panel-header"
import { SideNav } from "@/components/panels/side-nav"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useChatProvider } from "@/hooks/use-chat"
import { useResizableChatPanel } from "@/hooks/use-resizable-chat-panel"
import { cn } from "@/lib/utils"
import { useRef, useCallback, useState, useEffect } from "react"
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

  // Initialize mobile state with SSR-safe detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768
    }
    return false
  })

  // Simple mobile chat state - just open/closed
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)

  const desktopChatPanelRef = useRef<ImperativePanelHandle>(null)

  // Desktop chat panel hook - only used for desktop
  const {
    isChatPanelCollapsed: desktopIsChatPanelCollapsed,
    isMaximized: desktopIsMaximized,
    handleChatPanelToggle: desktopHandleChatPanelToggle,
    handleMaximizeToggle: desktopHandleMaximizeToggle,
    syncPanelCollapsedState: desktopSyncPanelCollapsedState,
  } = useResizableChatPanel({
    chatPanelRef: desktopChatPanelRef,
    config: {
      defaultSizePercentage: defaultLayout[1] ?? 30,
      expandedWidthPercentage: CHAT_PANEL_EXPANDED_WIDTH_PERCENTAGE,
      collapsedSizePercentage: CHAT_PANEL_COLLAPSED_SIZE_PERCENTAGE,
    },
    initialIsMaximized: Math.round(defaultLayout[1] ?? 30) === 100,
  })

  // Mobile chat toggle - simple open/close
  const handleMobileChatToggle = useCallback(() => {
    setIsMobileChatOpen((prev) => !prev)
  }, [])

  // Responsive behavior - only update isMobile state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const onLayout = useCallback((sizes: number[]) => {
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
  }, [])

  const onCollapse = useCallback(() => {
    desktopSyncPanelCollapsedState(true)
  }, [desktopSyncPanelCollapsedState])

  const onExpand = useCallback(() => {
    desktopSyncPanelCollapsedState(false)
  }, [desktopSyncPanelCollapsedState])

  // Main panel header toggle - different behavior for mobile/desktop
  const onChatPanelToggle = useCallback(() => {
    if (isMobile) {
      handleMobileChatToggle()
    } else {
      desktopHandleChatPanelToggle()
    }
  }, [isMobile, handleMobileChatToggle, desktopHandleChatPanelToggle])

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden">
      {/* Desktop: Vertical sidebar on the left */}
      <div className="hidden md:block">
        <SideNav />
      </div>

      {/* Mobile Chat Overlay */}
      {isMobile && (
        <MobileChatLayout
          isOpen={isMobileChatOpen}
          onClose={handleMobileChatToggle}
          onNewChat={handleNewChat}
          isServerHealthy={isServerHealthy}
        />
      )}

      {/* Mobile: Simple Layout */}
      {isMobile ? (
        <div className="flex h-full flex-col flex-1">
          <MainPanelHeader onChatPanelToggle={onChatPanelToggle} isCollapsed={!isMobileChatOpen} />
          {/* Mobile: Horizontal nav below header */}
          <div className="md:hidden">
            <SideNav />
          </div>
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      ) : (
        /* Desktop: Resizable Layout */
        <ResizablePanelGroup direction="horizontal" onLayout={onLayout}>
          {/* Main Panel */}
          <ResizablePanel defaultSize={defaultLayout[0]} className={cn(desktopIsMaximized && "hidden")}>
            <div className="flex h-full flex-col">
              <MainPanelHeader onChatPanelToggle={onChatPanelToggle} isCollapsed={desktopIsChatPanelCollapsed} />
              <div className="flex-1 overflow-auto md:min-w-[500px]">{children}</div>
            </div>
          </ResizablePanel>

          {/* Desktop Chat Layout */}
          <DesktopChatLayout
            chatPanelRef={desktopChatPanelRef}
            defaultSize={defaultLayout[1] ?? 30}
            isMaximized={desktopIsMaximized}
            isChatPanelCollapsed={desktopIsChatPanelCollapsed}
            collapsedSize={CHAT_PANEL_COLLAPSED_SIZE_PERCENTAGE}
            minSize={CHAT_PANEL_MIN_SIZE_PERCENTAGE}
            maxSize={CHAT_PANEL_MAX_SIZE_PERCENTAGE}
            onCollapse={onCollapse}
            onExpand={onExpand}
            onMaximizeToggle={desktopHandleMaximizeToggle}
            onNewChat={handleNewChat}
            isServerHealthy={isServerHealthy}
          />
        </ResizablePanelGroup>
      )}
    </div>
  )
}
