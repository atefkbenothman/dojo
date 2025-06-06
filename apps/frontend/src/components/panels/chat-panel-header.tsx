"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMCP } from "@/hooks/use-mcp"
import { MessageSquare, Server, Maximize, Minimize, Plus } from "lucide-react"
import { memo } from "react"

function MCPServersPopover() {
  const { activeConnections } = useMCP()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="outline" className="relative mr-2 hover:cursor-pointer" title="MCP Servers">
          <Server className="h-4.5 w-4.5" />
          {activeConnections.length > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center text-[8px] font-medium opacity-75">
              {activeConnections.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start" side="left">
        <div className="space-y-2">
          <p className="text-xs">MCP Servers</p>
          {activeConnections.length > 0 ? (
            <div className="flex flex-col gap-2">
              {activeConnections.map((conn) => (
                <div key={conn.serverId} className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500"></div>
                  <span className="text-xs">{conn.name}</span>
                  <span className="text-muted-foreground text-xs">({Object.keys(conn.tools || {}).length} tools)</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No connections</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ChatPanelHeaderProps {
  isCollapsed: boolean
  isMaximized: boolean
  onMaximizeToggle: () => void
  onNewChat: () => void
}

export const ChatPanelHeader = memo(function ChatPanelHeader({
  isCollapsed,
  isMaximized,
  onMaximizeToggle,
  onNewChat,
}: ChatPanelHeaderProps) {
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

          <MCPServersPopover />

          <Button onClick={onMaximizeToggle} size="icon" variant="outline" className="mr-2 hover:cursor-pointer">
            {isMaximized ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
          </Button>
        </>
      )}
    </div>
  )
})
