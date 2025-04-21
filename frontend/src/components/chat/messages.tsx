import { useVirtualizer } from "@tanstack/react-virtual"
import { useRef, useEffect, memo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import Link from "next/link"
import { CodeBlock } from "./code-block"
import { useChatProvider } from "@/hooks/use-chat"

const components: Partial<Components> = {
  // @ts-expect-error
  code: CodeBlock,
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
    return <div className="text-xs leading-6">{children}</div>
  },
}

interface MarkdownRendererProps {
  content: string
}

const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  return <ReactMarkdown components={components}>{content}</ReactMarkdown>
})

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
      <div
        className="relative flex w-full flex-col"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        <div
          className="absolute flex w-full flex-col gap-4 px-2 py-4"
          style={{
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
          }}
        >
          {virtualItems.map((vItem) => {
            const msg = messages[vItem.index]!
            return (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
              >
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-secondary text-secondary-foreground inline-block max-w-[80%] overflow-auto rounded-lg p-2 text-left wrap-break-word">
                      <p className="text-xs leading-6">
                        {msg.content.toString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-balanced inline-block w-full max-w-[98%] overflow-auto bg-transparent text-sm wrap-break-word">
                    <MarkdownRenderer content={msg.content.toString()} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
