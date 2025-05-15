import { memo, ReactNode } from "react"

interface CodeBlockProps {
  inline: boolean
  className: string
  children: ReactNode
}

export const CodeBlock = memo(function CodeBlock({ inline, className, children, ...props }: CodeBlockProps) {
  const isBlock = !inline && className && className.startsWith("language-")
  if (isBlock) {
    return (
      <div className="not-prose bg-muted my-2 block w-fit p-2 text-xs">
        <pre {...props} className="w-fit overflow-x-auto text-xs">
          <code className="break-words whitespace-pre-wrap">{children}</code>
        </pre>
      </div>
    )
  } else {
    return (
      <code className="bg-muted p-1 font-semibold" {...props}>
        {children}
      </code>
    )
  }
})
