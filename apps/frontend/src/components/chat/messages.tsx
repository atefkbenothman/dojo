import { MarkdownRenderer } from "@/components/chat/markdown-renderer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useChatProvider } from "@/hooks/use-chat"
import { useImageProvider } from "@/hooks/use-image"
import { cn } from "@/lib/utils"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ToolInvocation, UIMessage } from "ai"
import { Hammer, Check, Clock, Play, Lightbulb, Info, AlertTriangle } from "lucide-react"
import { useEffect, RefObject, memo } from "react"

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
  return (
    <MessageAccordion variant="reasoning" icon={<Lightbulb className="h-4 w-4" />} title="Reasoning">
      <pre className={preClassName}>{content}</pre>
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
  return (
    <div className="flex items-center space-x-1 w-fit px-1 py-2 text-red-500">
      {[0, 1, 2].map((dot) => (
        <div
          key={dot}
          className="h-1.5 w-1.5 animate-bounce bg-primary/50"
          style={{ animationDelay: `${dot * 0.2}s` }}
        />
      ))}
    </div>
  )
}

const MessageItem = memo(function MessageItem({
  msg,
}: {
  msg: UIMessage & { images?: { type: "generated_image"; images: { base64: string }[] } }
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary/10 text-foreground inline-block max-w-[80%] overflow-auto p-2 text-left wrap-break-word">
          <p className="text-xs leading-6">{msg.content.toString()}</p>
        </div>
      </div>
    )
  }

  if (msg.role === "system") {
    return <SystemMessage content={msg.content.toString()} />
  }

  if (msg.images && msg.images.type === "generated_image") {
    const images = msg.images.images
    if (Array.isArray(images)) {
      return (
        <div className="py-2">
          <GeneratedImagesRenderer images={images} />
        </div>
      )
    }
  }

  return (
    <div className="text-balanced inline-block h-fit w-full overflow-auto text-sm wrap-break-word">
      {msg.parts.map((part, idx) => {
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
        }
      })}
    </div>
  )
})

export function Messages({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const { messages, chatError, status } = useChatProvider()
  const { isImageGenerating } = useImageProvider()

  const virtualizer = useVirtualizer({
    count: messages.length,
    estimateSize: () => 80,
    getScrollElement: () => scrollRef.current,
    overscan: 3,
  })

  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" })
    }
  }, [messages, virtualizer])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
      <div className="relative flex w-full flex-col" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <div
          className="absolute flex w-full flex-col"
          style={{
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
          }}
        >
          {virtualItems.map((vItem) => (
            <div
              key={vItem.key}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              className="flex h-fit flex-col py-2"
            >
              <MessageItem msg={messages[vItem.index]!} />
            </div>
          ))}
        </div>
      </div>
      {status === "submitted" && <LoadingAnimation />}
      {isImageGenerating && <LoadingAnimation />}
      {chatError && status !== "submitted" && <ErrorMessage errorMessage={chatError} />}
    </div>
  )
}
