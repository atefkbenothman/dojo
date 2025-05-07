"use client"

import { useState, useRef, useEffect } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"
import { DarkModeToggle } from "@/components/dark-mode-toggle"
import { Chat } from "@/components/chat/chat"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  House,
  Server,
  LayoutGrid,
  Maximize,
  Minimize,
  Plus,
} from "lucide-react"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useChatProvider } from "@/hooks/use-chat"

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
    collapsedWidth: 8,
    expandedWidth: 30,
  },
}

const navigationItems = [
  {
    href: "/",
    icon: House,
    label: "Home",
  },
  {
    href: "/mcp",
    icon: Server,
    label: "MCP",
  },
  {
    href: "/tools",
    icon: LayoutGrid,
    label: "Tools",
  },
] as const

function Nav() {
  const pathname = usePathname()
  const { play, AudioComponent } = useSoundEffect("./hover.mp3", {
    volume: 0.5,
  })

  return (
    <div className="bg-card w-[42px] flex-shrink-0 border-r">
      {AudioComponent}
      <div className="bg-card flex h-12 flex-shrink-0 items-center justify-center border-b">
        <p className="text-base font-medium">⛩️</p>
      </div>
      <div className="flex h-full flex-col gap-4 py-4">
        {navigationItems.map(({ href, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <div key={href} className="flex w-full items-center justify-center">
              <Link
                href={href}
                onClick={() => play()}
                className={cn("text-primary/50 group-hover:text-primary", isActive && "text-primary")}
              >
                <div
                  className={cn(
                    "group hover:bg-muted hover:border-border border border-transparent p-2 hover:cursor-pointer hover:border",
                    isActive && "bg-muted border-border border",
                  )}
                >
                  <Icon className="h-5.5 w-5.5" />
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MainPanelHeader({ onSidebarToggle, isCollapsed }: { onSidebarToggle: () => void; isCollapsed: boolean }) {
  return (
    <div className="bg-card flex h-12 flex-shrink-0 items-center border-b pr-2 pl-4">
      <p className="flex-1 pr-4 text-base font-medium">Dojo</p>
      <div className="flex flex-row items-center gap-2">
        <DarkModeToggle />
        <Button onClick={onSidebarToggle} size="icon" variant="outline" className="hover:cursor-pointer">
          {isCollapsed ? <ChevronLeft className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
        </Button>
      </div>
    </div>
  )
}

function ChatPanelHeader({
  isCollapsed,
  isMaximized,
  onMaximizeToggle,
  onNewChat,
}: {
  isCollapsed: boolean
  isMaximized: boolean
  onMaximizeToggle: () => void
  onNewChat: () => void
}) {
  return (
    <div className="bg-card flex h-12 flex-shrink-0 items-center border-b">
      {isCollapsed ? (
        <div className="flex w-full items-center justify-center">
          <MessageSquare className="h-4.5 w-4.5" />
        </div>
      ) : (
        <>
          <p className="flex-1 px-4 text-base font-medium">Chat</p>
          <Button
            onClick={onNewChat}
            size="icon"
            variant="outline"
            className="mr-2 hover:cursor-pointer"
            title="New Chat"
          >
            <Plus className="h-4.5 w-4.5" />
          </Button>
          <Button onClick={onMaximizeToggle} size="icon" variant="outline" className="mr-2 hover:cursor-pointer">
            {isMaximized ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
          </Button>
        </>
      )}
    </div>
  )
}

export function ResizableLayout({ children }: { children: React.ReactNode }) {
  const { play, AudioComponent } = useSoundEffect("./hover.mp3", {
    volume: 0.5,
  })
  const { handleNewChat } = useChatProvider()

  const chatPanelRef = useRef<ImperativePanelHandle>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false)
  const [isMaximized, setIsMaximized] = useState<boolean>(false)

  useEffect(() => {
    const checkScreenSize = () => {
      const small = window.innerWidth < 640
      setIsSmallScreen(small)

      if (small && sidebarCollapsed) {
        setSidebarCollapsed(false)
        resizeChatPanel(panelConfig.chatPanel.minSize)
      }
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [sidebarCollapsed])

  const resizeChatPanel = (newSize: number) => {
    if (chatPanelRef.current) {
      chatPanelRef.current.resize(newSize)
    } else {
      console.warn("chat panel ref not yet available.")
    }
  }

  const newChat = () => {
    play()
    handleNewChat()
  }

  const handleSidebarClick = (mode: boolean) => {
    if (isSmallScreen && mode === true) {
      return
    }

    play()

    mode === true
      ? resizeChatPanel(panelConfig.chatPanel.collapsedWidth)
      : resizeChatPanel(panelConfig.chatPanel.expandedWidth)
    setSidebarCollapsed(mode)
  }

  const handleMaximizeToggle = () => {
    if (isMaximized) {
      // Restore to default sizes
      resizeChatPanel(panelConfig.chatPanel.defaultSize)
    } else {
      // Maximize chat panel
      resizeChatPanel(100)
    }
    setIsMaximized(!isMaximized)
    play()
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden">
      {AudioComponent}
      <Nav />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={panelConfig.mainPanel.defaultSize}
          className={cn("hidden sm:block", isMaximized && "hidden")}
        >
          <div className="flex h-full flex-col">
            <MainPanelHeader
              onSidebarToggle={() => handleSidebarClick(!sidebarCollapsed)}
              isCollapsed={sidebarCollapsed}
            />
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
          onCollapse={() => handleSidebarClick(true)}
          onExpand={() => handleSidebarClick(false)}
          style={{
            minWidth: `${panelConfig.chatPanel.minWidth}px`,
          }}
        >
          <div className="flex h-full w-full flex-col">
            <ChatPanelHeader
              isCollapsed={sidebarCollapsed}
              isMaximized={isMaximized}
              onMaximizeToggle={handleMaximizeToggle}
              onNewChat={newChat}
            />
            {sidebarCollapsed ? (
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
