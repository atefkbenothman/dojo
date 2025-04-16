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
import Link from "next/link"
import { ArrowUp } from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useRef, useState, useEffect } from "react"
import { useSoundEffect } from "@/hooks/use-sound-effect"

interface CodeBlockProps {
  node: any
  inline: boolean
  className: string
  children: any
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  if (!inline) {
    return (
      <div className="not-prose flex flex-col">
        <pre {...props} className={`w-full overflow-x-auto border text-xs`}>
          <code className="break-words whitespace-pre-wrap">{children}</code>
        </pre>
      </div>
    )
  } else {
    return (
      <code
        className={`${className} rounded-md bg-blue-300 px-1 py-0.5 text-sm`}
        {...props}
      >
        {children}
      </code>
    )
  }
}

const components: Partial<Components> = {
  code: ({ node, children, ...props }) => {
    return <code className="text-xs">{children}</code>
  },
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal" {...props}>
        {children}
      </ol>
    )
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="ml-4 px-2 py-1 text-xs" {...props}>
        {children}
      </li>
    )
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="ml-4 list-decimal" {...props}>
        {children}
      </ul>
    )
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="text-sm font-medium" {...props}>
        {children}
      </span>
    )
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="text-xs text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    )
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="mt-4 mb-2 text-lg font-medium" {...props}>
        {children}
      </h1>
    )
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="mt-4 mb-2 text-lg font-medium" {...props}>
        {children}
      </h2>
    )
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="mt-4 mb-2 text-xl font-medium" {...props}>
        {children}
      </h3>
    )
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="mt-4 mb-2 text-xl font-medium" {...props}>
        {children}
      </h4>
    )
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="mt-4 mb-2 text-xs font-medium" {...props}>
        {children}
      </h5>
    )
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="mt-4 mb-2 text-xs font-medium" {...props}>
        {children}
      </h6>
    )
  },
  p: ({ node, children, ...props }) => {
    return <p className="py-2 text-xs leading-6">{children}</p>
  },
}

export function Chat() {
  const {
    messages,
    input,
    handleInputChange,
    handleChat,
    selectedModelId,
    handleModelChange,
    availableModels,
  } = useChatProvider()
  const { play, AudioComponent } = useSoundEffect("./hover.mp3", {
    volume: 0.5,
  })

  const [selectedModel, setSelectedModel] = useState<string>(selectedModelId)
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: messages.length,
    estimateSize: () => 80,
    getScrollElement: () => scrollRef.current,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleTrigger = () => {
    play()
  }

  const handleSelectChange = (modelId: string) => {
    setSelectedModel(modelId)
    handleModelChange(modelId)
    play()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (input.trim() !== "") {
        handleChat()
      }
    }
  }

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
                      <div className="inline-block w-full overflow-auto bg-transparent p-2 text-sm wrap-break-word">
                        <ReactMarkdown components={components}>
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
          {AudioComponent}
          <div className="dark:bg-input/30 relative w-full border bg-transparent">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="ring-none max-h-[280px] min-h-[120px] flex-1 resize-none border-none focus-visible:ring-transparent sm:text-[16px] md:text-xs"
            />
            <div className="dark:bg-input/30 flex w-full items-baseline overflow-hidden bg-transparent p-2">
              <Select value={selectedModel} onValueChange={handleSelectChange}>
                <SelectTrigger onPointerDown={handleTrigger}>
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent className="text-xs" align="start">
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="ml-auto"
                variant="outline"
                onClick={handleChat}
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
