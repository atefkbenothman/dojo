import { MarkdownRenderer } from "@/components/chat/markdown-renderer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useChatProvider } from "@/hooks/use-chat"
import { cn } from "@/lib/utils"
import { useImageStore } from "@/store/use-image-store"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ToolInvocation, UIMessage } from "ai"
import { Hammer, Check, Clock, Play, Lightbulb, Info, AlertTriangle } from "lucide-react"
import { useEffect, RefObject, memo, useMemo, useState, useRef } from "react"

interface MessageAccordionProps {
  variant?: "error" | "system" | "reasoning" | "tool"
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

const variantStyles = {
  error: "bg-red-200 dark:bg-red-800 border border-red-500/50 text-red-700 dark:text-white",
  system: "bg-blue-100 dark:bg-blue-900 border border-blue-400/50 text-blue-900 dark:text-white",
  reasoning: "bg-yellow-100 dark:bg-yellow-900 border border-yellow-400/50 text-yellow-900 dark:text-white",
  tool: "bg-muted border border-muted-foreground/20 text-foreground dark:text-white",
}

const preClassName = "p-2 text-xs wrap-break-word whitespace-pre-wrap bg-background/80 dark:bg-background/50 rounded-sm"

function MessageAccordion({ variant = "tool", icon, title, children, defaultOpen, className }: MessageAccordionProps) {
  const open = defaultOpen ?? variant === "error"

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={open ? "message-accordion" : undefined}
      className={cn(variantStyles[variant], "w-full", className)}
    >
      <AccordionItem value="message-accordion" className="border-b-0">
        <AccordionTrigger className="p-2 hover:cursor-pointer hover:no-underline">
          <div className="flex flex-row items-center gap-2">
            {icon}
            <p className="text-xs font-semibold">{title}</p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-0 p-2 text-xs">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function ToolInvocationMessage({ content }: { content: ToolInvocation }) {
  const getStateInfo = () => {
    switch (content.state) {
      case "partial-call":
        return { icon: <Clock className="h-4 w-4" />, text: "Preparing" }
      case "call":
        return { icon: <Play className="h-4 w-4" />, text: "Calling" }
      case "result":
        return { icon: <Check className="h-4 w-4" />, text: "Completed" }
      default:
        return { icon: <Hammer className="h-4 w-4" />, text: "" }
    }
  }

  const { icon, text } = getStateInfo()

  return (
    <MessageAccordion variant="tool" icon={icon} title={content.toolName + (text ? ` (${text})` : "")}>
      {content.state === "result" ? (
        <div>
          <div className="text-muted-foreground mb-2 text-xs">Args:</div>
          <pre className={preClassName}>{JSON.stringify(content.args, null, 2)}</pre>
          <div className="text-muted-foreground mt-4 mb-2 text-xs">Result:</div>
          <pre className={preClassName}>{JSON.stringify(content.result, null, 2)}</pre>
        </div>
      ) : (
        <pre className={preClassName}>{JSON.stringify(content.args, null, 2)}</pre>
      )}
    </MessageAccordion>
  )
}

function ReasoningMessage({ content }: { content: string }) {
  const contentRef = useRef<HTMLPreElement>(null)

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content])

  return (
    <MessageAccordion variant="reasoning" icon={<Lightbulb className="h-4 w-4" />} title="Reasoning" defaultOpen={true}>
      <div className="relative max-h-[100px] overflow-y-auto rounded-sm">
        <pre ref={contentRef} className={cn(preClassName, "max-h-[100px] overflow-y-auto")}>
          {content.trim()}
        </pre>
      </div>
    </MessageAccordion>
  )
}

function GeneratedImagesRenderer({ images }: { images: { base64: string }[] }) {
  return (
    <div className="flex flex-wrap justify-start gap-2 p-2">
      {images.map((image, index) => (
        <img
          key={index}
          src={`data:image/png;base64,${image.base64}`}
          alt={`Generated image ${index + 1}`}
          className="max-h-[256px] max-w-[256px] rounded border object-contain"
        />
      ))}
    </div>
  )
}

function SystemMessage({ content }: { content: string }) {
  return (
    <MessageAccordion variant="system" icon={<Info className="h-4 w-4" />} title="System">
      <pre className={preClassName}>{content}</pre>
    </MessageAccordion>
  )
}

function ErrorMessage({ errorMessage }: { errorMessage: string }) {
  if (!errorMessage) return null
  return (
    <div className="py-2">
      <MessageAccordion
        variant="error"
        icon={<AlertTriangle className="h-4 w-4 flex-shrink-0" />}
        title="Error"
        defaultOpen
      >
        <pre className={preClassName}>{errorMessage}</pre>
      </MessageAccordion>
    </div>
  )
}

function LoadingAnimation() {
  const [frameIndex, setFrameIndex] = useState(0)
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length)
    }, 80)

    return () => clearInterval(interval)
  }, [frames.length])

  return (
    <div className="flex items-center w-fit px-1 py-4 text-primary">
      <span className="text-lg font-mono">{frames[frameIndex]}</span>
    </div>
  )
}

const MessageItem = memo(function MessageItem({
  msg,
}: {
  msg: UIMessage & { images?: { type: "generated_image"; images: { base64: string }[] } }
}) {
  // Sort parts to ensure reasoning comes first
  const sortedParts = useMemo(() => {
    if (!msg.parts) return []
    const reasoning = msg.parts.filter((part) => part.type === "reasoning")
    const other = msg.parts.filter((part) => part.type !== "reasoning")
    return [...reasoning, ...other]
  }, [msg.parts])

  if (msg.role === "user") {
    return (
      <div className="flex justify-end py-4">
        <div className="bg-primary/10 text-foreground inline-block max-w-[80%] overflow-auto p-2 text-left wrap-break-word">
          <p className="text-xs leading-6">{msg.content.toString()}</p>
        </div>
      </div>
    )
  }

  if (msg.role === "system") {
    return (
      <div className="pb-4">
        <SystemMessage content={msg.content.toString()} />
      </div>
    )
  }

  if (msg.images && msg.images.type === "generated_image") {
    const images = msg.images.images
    if (Array.isArray(images)) {
      return (
        <div className="py-4">
          <GeneratedImagesRenderer images={images} />
        </div>
      )
    }
  }

  return (
    <div className="text-balanced inline-block h-fit w-full overflow-auto text-sm wrap-break-word">
      {sortedParts.map((part, idx) => {
        switch (part.type) {
          case "text":
            return (
              <div key={idx}>
                <MarkdownRenderer content={part.text} />
              </div>
            )
          case "reasoning":
            return (
              <div className="py-2" key={idx}>
                <ReasoningMessage content={part.reasoning} />
              </div>
            )
          case "tool-invocation":
            return (
              <div className="py-2" key={idx}>
                <ToolInvocationMessage content={part.toolInvocation} />
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
})

type VirtualMessage =
  | { type: "message"; msg: UIMessage & { images?: { type: "generated_image"; images: { base64: string }[] } } }
  | { type: "loading" }
  | { type: "error"; errorMessage: string }

export function Messages({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const { messages, chatError, status } = useChatProvider()
  const { isImageGenerating } = useImageStore()

  const allItems = useMemo<VirtualMessage[]>(() => {
    const items: VirtualMessage[] = messages.map((msg) => ({ type: "message", msg }))
    if (status === "submitted" || isImageGenerating) {
      items.push({ type: "loading" })
    }
    if (chatError && status !== "submitted") {
      items.push({ type: "error", errorMessage: chatError })
    }
    return items
  }, [messages, status, chatError, isImageGenerating])

  const virtualizer = useVirtualizer({
    count: allItems.length,
    estimateSize: (i) => {
      const item = allItems[i]
      if (item?.type === "message") {
        return 80
      }
      return 40
    },
    getScrollElement: () => scrollRef.current,
    overscan: 3,
  })

  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    if (allItems.length > 0) {
      virtualizer.scrollToIndex(allItems.length - 1, { align: "end" })
    }
  }, [allItems, virtualizer])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
      <div className="relative flex w-full flex-col" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <div
          className="absolute flex w-full flex-col"
          style={{
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
          }}
        >
          {virtualItems.map((vItem) => {
            const item = allItems[vItem.index]!
            return (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                className="flex h-fit flex-col"
              >
                {item.type === "message" && <MessageItem msg={item.msg} />}
                {item.type === "loading" && <LoadingAnimation />}
                {item.type === "error" && <ErrorMessage errorMessage={item.errorMessage} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
