"use client"

import { Chat } from "@/components/chat/chat"
import { ChatPanelHeader } from "@/components/panels/chat-panel-header"
import { MainPanelHeader } from "@/components/panels/main-panel-header"
import { SideNav } from "@/components/panels/side-nav"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useChatProvider } from "@/hooks/use-chat"
import { useResizableChatPanel } from "@/hooks/use-resizable-chat-panel"
import { useSoundEffectContext } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { useRef, useCallback, useMemo } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"

interface ResizableLayoutProps {
  children: React.ReactNode
  defaultLayout: [number, number]
}

const CHAT_PANEL_COLLAPSED_SIZE_PERCENTAGE = 2
const CHAT_PANEL_EXPANDED_WIDTH_PERCENTAGE = 30
const CHAT_PANEL_MIN_SIZE_PERCENTAGE = 20
const CHAT_PANEL_MAX_SIZE_PERCENTAGE = 100

export function ResizableLayout({ children, defaultLayout }: ResizableLayoutProps) {
  const { handleNewChat } = useChatProvider()

  const { play } = useSoundEffectContext()

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

  const newChat = useCallback(() => {
    play("./sounds/click.mp3", { volume: 0.5 })
    handleNewChat()
  }, [play, handleNewChat])

  const onLayout = useCallback((sizes: number[]) => {
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
  }, [])

  const onCollapse = useCallback(() => syncPanelCollapsedState(true), [syncPanelCollapsedState])
  const onExpand = useCallback(() => syncPanelCollapsedState(false), [syncPanelCollapsedState])
  const chatPanelStyle = useMemo(() => ({ minWidth: "40px" }), [])

  const onChatPanelToggle = useCallback(() => handleChatPanelToggle(), [handleChatPanelToggle])

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden">
      <SideNav />
      <ResizablePanelGroup direction="horizontal" onLayout={onLayout}>
        {/* Main Panel */}
        <ResizablePanel defaultSize={defaultLayout[0]} className={cn(isMaximized && "hidden")}>
          <div className="flex h-full flex-col">
            <MainPanelHeader onChatPanelToggle={onChatPanelToggle} isCollapsed={isChatPanelCollapsed} />
            <div className="flex-1 overflow-auto p-4">{children}</div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className={cn(isMaximized && "hidden")} />
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
          style={chatPanelStyle}
        >
          <div className="flex h-full w-full flex-col">
            <ChatPanelHeader
              isCollapsed={isChatPanelCollapsed}
              isMaximized={isMaximized}
              onMaximizeToggle={handleMaximizeToggle}
              onNewChat={newChat}
            />
            {isChatPanelCollapsed ? (
              <div className="flex flex-1 items-center justify-center" />
            ) : (
              <div className={cn("flex flex-1 flex-col overflow-hidden p-2", isMaximized && "mx-auto flex w-full")}>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <Chat />
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
