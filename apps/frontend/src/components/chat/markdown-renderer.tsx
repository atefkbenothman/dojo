import { CodeBlock } from "@/components/chat/code-block"
import Link from "next/link"
import { memo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"

const components: Partial<Components> = {
  // @ts-expect-error - CodeBlock props are compatible with react-markdown's code component
  code: CodeBlock,
  pre: ({ children }) => <>{children}</>,
  ol: ({ children, ...props }) => {
    return (
      <ol className="list-decimal" {...props}>
        {children}
      </ol>
    )
  },
  li: ({ children, ...props }) => {
    return (
      <li className="ml-4 px-2 py-1 text-xs" {...props}>
        {children}
      </li>
    )
  },
  ul: ({ children, ...props }) => {
    return (
      <ul className="ml-4 list-decimal" {...props}>
        {children}
      </ul>
    )
  },
  strong: ({ children, ...props }) => {
    return (
      <span className="text-sm font-medium" {...props}>
        {children}
      </span>
    )
  },
  a: ({ children, ...props }) => {
    return (
      // @ts-expect-error - Link props are compatible with react-markdown's anchor component
      <Link className="text-xs text-blue-500 hover:underline" target="_blank" rel="noreferrer" {...props}>
        {children}
      </Link>
    )
  },
  h1: ({ children, ...props }) => {
    return (
      <h1 className="mt-4 mb-2 text-lg font-medium" {...props}>
        {children}
      </h1>
    )
  },
  h2: ({ children, ...props }) => {
    return (
      <h2 className="mt-4 mb-2 text-lg font-medium" {...props}>
        {children}
      </h2>
    )
  },
  h3: ({ children, ...props }) => {
    return (
      <h3 className="mt-4 mb-2 text-xl font-medium" {...props}>
        {children}
      </h3>
    )
  },
  h4: ({ children, ...props }) => {
    return (
      <h4 className="mt-4 mb-2 text-xl font-medium" {...props}>
        {children}
      </h4>
    )
  },
  h5: ({ children, ...props }) => {
    return (
      <h5 className="mt-4 mb-2 text-xs font-medium" {...props}>
        {children}
      </h5>
    )
  },
  h6: ({ children, ...props }) => {
    return (
      <h6 className="mt-4 mb-2 text-xs font-medium" {...props}>
        {children}
      </h6>
    )
  },
  p: ({ children, ...props }) => {
    return (
      <div className="px-1 text-xs leading-6 py-2" {...props}>
        {children}
      </div>
    )
  },
  em: ({ children, ...props }) => {
    return (
      <span className="italic text-xs" {...props}>
        {children}
      </span>
    )
  },
}

export interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  try {
    const parsedJson = JSON.parse(content)
    if (typeof parsedJson === "object" && parsedJson !== null) {
      return (
        <div className="overflow-auto p-2 font-sans text-xs whitespace-pre-wrap">
          {JSON.stringify(parsedJson, null, 2)}
        </div>
      )
    }
    return <ReactMarkdown components={components}>{content}</ReactMarkdown>
  } catch {
    return <ReactMarkdown components={components}>{content}</ReactMarkdown>
  }
})
