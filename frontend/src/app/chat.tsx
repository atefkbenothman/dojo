"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChatProvider } from "@/hooks/use-chat"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowUp } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useRef } from "react"

export function Chat() {
  const { messages, input, handleInputChange, handleSend } = useChatProvider()

  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: messages.length,
    estimateSize: () => 80,
    getScrollElement: () => scrollRef.current,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
          <div
            className="relative flex w-full flex-col"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            <div
              className="absolute flex w-full flex-col p-2"
              style={{
                transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
              }}
            >
              {/* Message List */}
              {virtualItems.map((vItem) => {
                const msg = messages[vItem.index]!
                return (
                  <div
                    key={vItem.key}
                    data-index={vItem.index}
                    ref={virtualizer.measureElement}
                  >
                    {msg.role === "user" ? (
                      <div className="bg-accent text-accent-foreground inline-block w-full overflow-auto p-2 wrap-break-word">
                        <p className="text-xs leading-6">
                          {msg.content.toString()}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-popover text-accent-foreground inline-block w-full overflow-auto p-2 text-sm wrap-break-word">
                        <ReactMarkdown
                          components={{
                            h1: ({ ...props }) => (
                              <h1 className="text-md font-bold" {...props} />
                            ),
                            h2: ({ ...props }) => (
                              <h2 className="text-xs" {...props} />
                            ),
                            h3: ({ ...props }) => (
                              <h3 className="text-xs" {...props} />
                            ),
                            p: ({ ...props }) => (
                              <p className="text-xs leading-6" {...props} />
                            ),
                            ul: ({ ...props }) => (
                              <ul className="text-xs" {...props} />
                            ),
                            ol: ({ ...props }) => (
                              <ol className="text-xs" {...props} />
                            ),
                            li: ({ ...props }) => (
                              <li className="text-xs" {...props} />
                            ),
                            code: ({ className, children, ...props }: any) => {
                              return (
                                <code
                                  className="text-xs font-semibold"
                                  {...props}
                                >
                                  {children}
                                </code>
                              )
                            },
                          }}
                        >
                          {msg.content.toString()}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex flex-shrink-0 flex-col items-center gap-2 border-t p-2">
          <div className="dark:bg-input/30 relative w-full border bg-transparent">
            <Textarea
              value={input}
              onChange={handleInputChange}
              className="ring-none max-h-[280px] min-h-[100px] flex-1 resize-none border-none focus-visible:ring-transparent sm:text-[16px] md:text-xs"
            />
            <div className="dark:bg-input/30 flex w-full overflow-hidden bg-transparent p-2">
              <Select>
                <SelectTrigger className="">
                  <SelectValue placeholder="Model " />
                </SelectTrigger>
                <SelectContent className="text-xs" align="start">
                  <SelectItem value="light" className="text-xs">
                    Light
                  </SelectItem>
                  <SelectItem value="dark" className="text-xs">
                    Dark
                  </SelectItem>
                  <SelectItem value="system" className="text-xs">
                    System
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="ml-auto"
                variant="outline"
                onClick={handleSend}
                disabled={input.trim() === ""}
              >
                <ArrowUp className="h-4 w-4" strokeWidth={3} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
