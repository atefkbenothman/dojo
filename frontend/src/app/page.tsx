"use client"

import { useState, useRef, useEffect } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"
import { DarkModeToggle } from "@/components/dark-mode-toggle"
import { Chat } from "@/components/chat/chat"
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
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false)

  // Check if screen is small on mount and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      const small = window.innerWidth < 640
      setIsSmallScreen(small)

      // If screen is small, ensure sidebar is not collapsed
      if (small && sidebarCollapsed) {
        setSidebarCollapsed(false)
        resizeChatPanel(20)
      }
    }

    // Check on mount
    checkScreenSize()

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize)

    // Clean up event listener
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [sidebarCollapsed])

  const resizeChatPanel = (newSize: number) => {
    if (chatPanelRef.current) {
      chatPanelRef.current.resize(newSize)
    } else {
      console.warn("chat panel ref not yet available.")
    }
  }

  const handleSidebarClick = (mode: boolean) => {
    // Don't allow collapsing on small screens
    if (isSmallScreen && mode === true) {
      return
    }

    mode === true ? resizeChatPanel(8) : resizeChatPanel(30)
    setSidebarCollapsed(mode)
    play()
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden">
      {AudioComponent}
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={70} className="hidden sm:block">
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
          defaultSize={30}
          collapsible
          collapsedSize={3}
          onCollapse={() => handleSidebarClick(true)}
          onExpand={() => handleSidebarClick(false)}
          style={{
            minWidth: "2.5rem",
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
