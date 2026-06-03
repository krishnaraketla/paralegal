"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ChatContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {}

function ChatContainer({ className, ...props }: ChatContainerProps) {
  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden", className)}
      {...props}
    />
  )
}

export interface ChatContainerContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  autoScroll?: boolean
}

function ChatContainerContent({
  className,
  autoScroll = true,
  children,
  ...props
}: ChatContainerContentProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = React.useState(false)

  // Auto-scroll to bottom when new content arrives
  React.useEffect(() => {
    if (autoScroll && !userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [children, autoScroll, userScrolled])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const isAtBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 50
    setUserScrolled(!isAtBottom)
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn("flex-1 overflow-y-auto p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function ChatContainerScrollAnchor() {
  const anchorRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    anchorRef.current?.scrollIntoView({ behavior: "smooth" })
  })

  return <div ref={anchorRef} className="h-0" />
}

export { ChatContainer, ChatContainerContent, ChatContainerScrollAnchor }



