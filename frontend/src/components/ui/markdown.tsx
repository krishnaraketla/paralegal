"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

export interface MarkdownProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string
}

function Markdown({ className, children, ...props }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-stone max-w-none dark:prose-invert",
        "prose-p:leading-relaxed prose-pre:p-0",
        "prose-headings:font-semibold",
        "prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm",
        "prose-pre:bg-muted prose-pre:rounded-lg",
        className
      )}
      {...props}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom rendering for code blocks
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const isInline = !match
            
            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <pre className="overflow-x-auto rounded-lg bg-muted p-4">
                <code className={cn("text-sm", className)} {...props}>
                  {children}
                </code>
              </pre>
            )
          },
          // Custom link rendering
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

export { Markdown }



