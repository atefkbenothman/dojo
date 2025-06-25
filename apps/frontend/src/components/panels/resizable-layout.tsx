"use client"

import { Chat } from "@/components/chat/chat"
import { ChatPanelHeader } from "@/components/panels/chat-panel-header"
import { MainPanelHeader } from "@/components/panels/main-panel-header"
import { SideNav } from "@/components/panels/side-nav"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useChatProvider } from "@/hooks/use-chat"
import { useResizableChatPanel } from "@/hooks/use-resizable-chat-panel"
import { cn } from "@/lib/utils"
import { useRef, useCallback } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"

interface ResizableLayoutProps {
  children: React.ReactNode
  defaultLayout: [number, number]
  isServerHealthy: boolean
}

const CHAT_PANEL_COLLAPSED_SIZE_PERCENTAGE = 0
const CHAT_PANEL_EXPANDED_WIDTH_PERCENTAGE = 30
const CHAT_PANEL_MIN_SIZE_PERCENTAGE = 20
const CHAT_PANEL_MAX_SIZE_PERCENTAGE = 60

export function ResizableLayout({ children, defaultLayout, isServerHealthy }: ResizableLayoutProps) {
  const { handleNewChat } = useChatProvider()

  const chatPanelRef = useRef<ImperativePanelHandle>(null)

  const { isChatPanelCollapsed, isMaximized, handleChatPanelToggle, handleMaximizeToggle, syncPanelCollapsedState } =
    useResizableChatPanel({
      chatPanelRef,
      config: {
        defaultSizePercentage: defaultLayout[1],
        expandedWidthPercentage: CHAT_PANEL_EXPANDED_WIDTH_PERCENTAGE,
        collapsedSizePercentage: CHAT_PANEL_COLLAPSED_SIZE_PERCENTAGE,
      },
      initialIsMaximized: Math.round(defaultLayout[1]) === 100,
    })

  const onLayout = useCallback((sizes: number[]) => {
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
  }, [])
  const onCollapse = useCallback(() => syncPanelCollapsedState(true), [syncPanelCollapsedState])
  const onExpand = useCallback(() => syncPanelCollapsedState(false), [syncPanelCollapsedState])

  const onChatPanelToggle = useCallback(() => handleChatPanelToggle(), [handleChatPanelToggle])

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden">
      <SideNav />
      <ResizablePanelGroup direction="horizontal" onLayout={onLayout}>
        {/* Main Panel */}
        <ResizablePanel defaultSize={defaultLayout[0]} className={cn(isMaximized && "hidden")}>
          <div className="flex h-full flex-col">
            <MainPanelHeader onChatPanelToggle={onChatPanelToggle} isCollapsed={isChatPanelCollapsed} />
            <div className="flex-1 overflow-auto min-w-[500px]">{children}</div>
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className={cn((isMaximized || isChatPanelCollapsed) && "hidden")}
          hitAreaMargins={{ coarse: 10, fine: 5 }}
        />
        {/* Chat Panel */}
        <ResizablePanel
          id="chat-panel"
          ref={chatPanelRef}
          collapsible
          collapsedSize={CHAT_PANEL_COLLAPSED_SIZE_PERCENTAGE}
          defaultSize={defaultLayout[1]}
          minSize={CHAT_PANEL_MIN_SIZE_PERCENTAGE}
          maxSize={CHAT_PANEL_MAX_SIZE_PERCENTAGE}
          className="bg-card h-full w-full flex-shrink-0"
          onCollapse={onCollapse}
          onExpand={onExpand}
        >
          <div className="flex h-full w-full flex-col">
            <ChatPanelHeader
              isCollapsed={isChatPanelCollapsed}
              isMaximized={isMaximized}
              onMaximizeToggle={handleMaximizeToggle}
              onNewChat={handleNewChat}
            />
            {isChatPanelCollapsed ? (
              <div className="flex flex-1 items-center justify-center" />
            ) : (
              <div className={cn("flex flex-1 flex-col overflow-hidden p-2", isMaximized && "mx-auto flex w-full")}>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <Chat isServerHealthy={isServerHealthy} />
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
