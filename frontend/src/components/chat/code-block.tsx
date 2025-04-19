import { memo } from "react"

interface CodeBlockProps {
  node: any
  inline: boolean
  className: string
  children: any
}

export const CodeBlock = memo(function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  if (!inline) {
    return (
      <div className="not-prose block">
        <pre {...props} className={`w-full overflow-x-auto text-xs`}>
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
})
