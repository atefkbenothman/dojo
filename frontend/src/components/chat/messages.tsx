import { useRef, useEffect } from "react"
import type { CoreMessage, ToolCallPart, ToolResultPart } from "ai"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useChatProvider } from "@/hooks/use-chat"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MarkdownRenderer } from "@/components/chat/markdown-renderer"
import { Hammer } from "lucide-react"

function ToolCallMessage({ content }: { content: ToolCallPart }) {
  return (
    <Accordion type="single" collapsible className="bg-muted w-full">
      <AccordionItem value={content.toolCallId}>
        <AccordionTrigger className="p-2 hover:cursor-pointer">
          <div className="flex flex-row items-center gap-2">
            <Hammer className="h-4 w-4" />
            <p className="text-xs">{content.toolName}</p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="py-2">
          <pre className="overflow-auto p-2 text-xs">{JSON.stringify(content.args, null, 2)}</pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function ToolResultMessage({ content }: { content: ToolResultPart }) {
  return (
    <Accordion type="single" collapsible className="bg-muted w-full">
      <AccordionItem value={content.toolCallId}>
        <AccordionTrigger className={`p-2 text-xs hover:cursor-pointer ${content.isError ? "text-destructive" : ""}`}>
          {content.toolName} Result
        </AccordionTrigger>
        <AccordionContent className="py-2">
          <pre className="overflow-auto p-2 text-xs">{JSON.stringify(content.result, null, 2)}</pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function ImageDisplayPartRenderer({ part }: { part: any }) {
  return (
    <div className="flex justify-start p-2">
      <img
        src={`data:image/png;base64,${part["base64"]}`}
        alt={"Generated image"}
        className="max-h-[256px] max-w-[256px] rounded border object-contain"
      />
    </div>
  )
}

function MessageItem({ msg }: { msg: CoreMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary/10 text-foreground inline-block max-w-[80%] overflow-auto p-2 text-left wrap-break-word">
          <p className="text-xs leading-6">{msg.content.toString()}</p>
        </div>
      </div>
    )
  }

  if (typeof msg.content === "string") {
    return (
      <div className="p-2">
        <MarkdownRenderer content={msg.content.toString()} />
      </div>
    )
  }

  return (
    <div className="text-balanced inline-block h-fit w-full overflow-auto text-sm wrap-break-word">
      {msg.content.map((part: any, idx: number) => {
        switch (part.type) {
          case "text":
            return (
              <div className="p-2" key={idx}>
                <MarkdownRenderer content={part.text} />
              </div>
            )
          case "tool-call":
            return <ToolCallMessage key={part.toolCallId} content={part} />
          // @ts-ignore
          case "image_display":
            return <ImageDisplayPartRenderer part={part} key={idx} />
        }
      })}
    </div>
  )
}

export function Messages() {
  const { messages } = useChatProvider()
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

// if (msg.role === "tool") {
//   return (
//     <div
//       key={vItem.key}
//       data-index={vItem.index}
//       ref={measureElement}
//       className="flex h-fit flex-col py-2"
//     >
//       <div className="text-balanced inline-block h-fit w-full overflow-auto text-sm wrap-break-word">
//         {Array.isArray(msg.content) &&
//           msg.content[0] &&
//           "type" in msg.content[0] &&
//           msg.content[0].type === "tool-result" && (
//             <ToolResultMessage
//               key={(msg.content[0] as ToolResultPart).toolCallId}
//               content={msg.content[0] as ToolResultPart}
//             />
//           )}
//       </div>
//     </div>
//   )
// }
