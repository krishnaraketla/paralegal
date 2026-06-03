"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "user" | "assistant"
}

function Message({ className, variant = "assistant", ...props }: MessageProps) {
  return (
    <div
      className={cn(
        "flex gap-3",
        variant === "user" && "flex-row-reverse",
        className
      )}
      {...props}
    />
  )
}

export interface MessageAvatarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
}

function MessageAvatar({
  className,
  src,
  alt,
  fallback,
  ...props
}: MessageAvatarProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium",
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || "Avatar"}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span>{fallback || "AI"}</span>
      )}
    </div>
  )
}

export interface MessageContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "user" | "assistant"
}

function MessageContent({
  className,
  variant = "assistant",
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn(
        "flex-1 space-y-2 overflow-hidden rounded-lg px-3 py-2 text-sm",
        variant === "user"
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Message, MessageAvatar, MessageContent }



