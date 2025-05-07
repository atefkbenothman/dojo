import { memo } from "react"
import Link from "next/link"
import ReactMarkdown, { type Components } from "react-markdown"
import { CodeBlock } from "@/components/chat/code-block"

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
      <span className="bg-blue-200 text-sm font-medium" {...props}>
        {children}
      </span>
    )
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link className="text-xs text-blue-500 hover:underline" target="_blank" rel="noreferrer" {...props}>
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

export interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return <ReactMarkdown components={components}>{content}</ReactMarkdown>
})
