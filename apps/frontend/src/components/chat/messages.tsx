import { MarkdownRenderer } from "@/components/chat/markdown-renderer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useChatProvider } from "@/hooks/use-chat"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ToolInvocation, UIMessage } from "ai"
import { Hammer, Check, Clock, Play, Lightbulb, Info } from "lucide-react"
import { useEffect, RefObject } from "react"

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
    <Accordion type="single" collapsible className="bg-muted w-full">
      <AccordionItem value={content.toolCallId}>
        <AccordionTrigger className="p-2 hover:cursor-pointer">
          <div className="flex flex-row items-center gap-2">
            {icon}
            <p className="text-xs">{content.toolName}</p>
            {text && <span className="text-muted-foreground ml-2 text-xs">{text}</span>}
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-2">
          {content.state === "result" && "result" in content ? (
            <div>
              <div className="text-muted-foreground mb-2 text-xs">Args:</div>
              <pre className="overflow-auto p-2 text-xs">{JSON.stringify(content.args, null, 2)}</pre>
              <div className="text-muted-foreground mt-4 mb-2 text-xs">Result:</div>
              <pre className="overflow-auto p-2 text-xs">{JSON.stringify(content.result, null, 2)}</pre>
            </div>
          ) : (
            <pre className="overflow-auto p-2 text-xs">{JSON.stringify(content.args, null, 2)}</pre>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function ReasoningMessage({ content }: { content: string }) {
  return (
    <Accordion type="single" collapsible className="bg-muted w-full">
      <AccordionItem value="reasoning">
        <AccordionTrigger className="p-2 hover:cursor-pointer">
          <div className="flex flex-row items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <p className="text-xs">Reasoning</p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-2">
          <pre className="overflow-auto p-2 text-xs wrap-break-word whitespace-pre-wrap">{content}</pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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
    <Accordion type="single" collapsible className="bg-muted w-full">
      <AccordionItem value="system-message">
        <AccordionTrigger className="p-2 hover:cursor-pointer">
          <div className="flex flex-row items-center gap-2">
            <Info className="h-4 w-4" />
            <p className="text-xs">System</p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-1 text-xs">
          <pre className="p-2 text-xs wrap-break-word whitespace-pre-wrap">{content}</pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function MessageItem({
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
      {msg.parts.map((part, idx: number) => {
        switch (part.type) {
          case "text":
            return (
              <div className="py-2" key={idx}>
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
}

export function Messages({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const { messages } = useChatProvider()

  const virtualizer = useVirtualizer({
    count: messages.length,
    estimateSize: () => 80,
    getScrollElement: () => scrollRef.current,
    overscan: 5,
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
    </div>
  )
}
