"use client"

import { useState, useRef } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"
import { DarkModeToggle } from "@/components/dark-mode-toggle"
import { Chat } from "@/app/chat"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import { MCPList } from "./mcp-list"

export default function Home() {
  const { play, AudioComponent } = useSoundEffect("./hover.mp3", {
    volume: 0.5,
  })

  const chatPanelRef = useRef<ImperativePanelHandle>(null)

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)

  const resizeChatPanel = (newSize: number) => {
    if (chatPanelRef.current) {
      chatPanelRef.current.resize(newSize)
    } else {
      console.warn("chat panel ref not yet available.")
    }
  }

  const handleSidebarClick = (mode: boolean) => {
    mode === true ? resizeChatPanel(8) : resizeChatPanel(20)
    setSidebarCollapsed(mode)
    play()
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {AudioComponent}
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={80}>
          <div className="flex h-full flex-col">
            {/* Content Header */}
            <div className="bg-card flex h-12 flex-shrink-0 items-center border-b pr-2 pl-4">
              <p className="flex-1 text-base font-medium">Terminal</p>
              <div className="flex flex-row items-center gap-2">
                <DarkModeToggle />
                <Button
                  onClick={() => handleSidebarClick(!sidebarCollapsed)}
                  size="icon"
                  variant="outline"
                >
                  {sidebarCollapsed ? (
                    <ChevronLeft className="h-4.5 w-4.5" />
                  ) : (
                    <ChevronRight className="h-4.5 w-4.5" />
                  )}
                </Button>
              </div>
            </div>
            {/* Content Body */}
            <div className="flex-1 overflow-auto p-4">
              <MCPList />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="chat-panel"
          ref={chatPanelRef}
          className="bg-card h-full w-full"
          minSize={20}
          maxSize={60}
          defaultSize={20}
          collapsible
          collapsedSize={3}
          onCollapse={() => handleSidebarClick(true)}
          onExpand={() => handleSidebarClick(false)}
          style={{
            minWidth: "2rem",
          }}
        >
          <div className={cn("flex h-full w-full flex-col")}>
            <div className="flex h-12 flex-shrink-0 items-center border-b px-2">
              {sidebarCollapsed ? (
                <div className="flex w-full items-center justify-center">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
              ) : (
                <p className="flex-1 text-base font-medium">Chat</p>
              )}
            </div>
            {sidebarCollapsed ? (
              <div className="flex flex-1 items-center justify-center" />
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden">
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
