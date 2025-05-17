"use client"

import { ChatPanelHeader } from "./chat-panel-header"
import { MainPanelHeader } from "./main-panel-header"
import { SideNav } from "./side-nav"
import { Chat } from "@/components/chat/chat"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useChatProvider } from "@/hooks/use-chat"
import { useResizableChatPanel } from "@/hooks/use-resizable-chat-panel"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { useRef } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"

const panelConfig = {
  mainPanel: {
    defaultSize: 70,
  },
  chatPanel: {
    minSize: 20,
    maxSize: 100,
    defaultSize: 30,
    collapsedSize: 3,
    minWidth: 42,
    collapsedWidthPercentage: 8,
    expandedWidthPercentage: 30,
  },
}

export function ResizableLayout({ children }: { children: React.ReactNode }) {
  const { handleNewChat } = useChatProvider()

  const { play } = useSoundEffect("./hover.mp3", {
    volume: 0.5,
  })

  const chatPanelRef = useRef<ImperativePanelHandle>(null)

  const { isChatPanelCollapsed, isMaximized, handleChatPanelToggle, handleMaximizeToggle } = useResizableChatPanel({
    chatPanelRef,
    play,
    config: {
      defaultSizePercentage: panelConfig.chatPanel.defaultSize,
      collapsedWidthPercentage: panelConfig.chatPanel.collapsedWidthPercentage,
      expandedWidthPercentage: panelConfig.chatPanel.expandedWidthPercentage,
    },
  })

  const newChat = () => {
    play()
    handleNewChat()
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden">
      <SideNav />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={panelConfig.mainPanel.defaultSize}
          className={cn("hidden sm:block", isMaximized && "hidden")}
        >
          <div className="flex h-full flex-col">
            <MainPanelHeader onChatPanelToggle={() => handleChatPanelToggle()} isCollapsed={isChatPanelCollapsed} />
            <div className="flex-1 overflow-auto p-4">{children}</div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className={cn(isMaximized && "hidden")} />
        <ResizablePanel
          id="chat-panel"
          ref={chatPanelRef}
          className="bg-card h-full w-full flex-shrink-0"
          minSize={panelConfig.chatPanel.minSize}
          maxSize={panelConfig.chatPanel.maxSize}
          defaultSize={panelConfig.chatPanel.defaultSize}
          collapsible
          collapsedSize={panelConfig.chatPanel.collapsedSize}
          onCollapse={() => handleChatPanelToggle(true)}
          onExpand={() => handleChatPanelToggle(false)}
          style={{
            minWidth: `${panelConfig.chatPanel.minWidth}px`,
          }}
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
