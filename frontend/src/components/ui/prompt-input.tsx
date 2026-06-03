"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const PromptInputContext = React.createContext<{
  value: string
  setValue: (value: string) => void
  disabled?: boolean
} | null>(null)

function usePromptInput() {
  const context = React.useContext(PromptInputContext)
  if (!context) {
    throw new Error("usePromptInput must be used within a PromptInput")
  }
  return context
}

export interface PromptInputProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

function PromptInput({
  className,
  value: controlledValue,
  onValueChange,
  disabled,
  children,
  ...props
}: PromptInputProps) {
  const [internalValue, setInternalValue] = React.useState("")
  const value = controlledValue ?? internalValue
  const setValue = React.useCallback(
    (newValue: string) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [controlledValue, onValueChange]
  )

  return (
    <PromptInputContext.Provider value={{ value, setValue, disabled }}>
      <div
        className={cn(
          "flex items-end gap-2 rounded-lg border bg-background p-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  )
}

export interface PromptInputTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  onSubmit?: () => void
}

function PromptInputTextarea({
  className,
  onSubmit,
  onKeyDown,
  ...props
}: PromptInputTextareaProps) {
  const { value, setValue, disabled } = usePromptInput()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
    onKeyDown?.(e)
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      rows={1}
      className={cn(
        "flex-1 resize-none border-0 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

export interface PromptInputActionsProps
  extends React.HTMLAttributes<HTMLDivElement> {}

function PromptInputActions({
  className,
  children,
  ...props
}: PromptInputActionsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      {children}
    </div>
  )
}

export interface PromptInputActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string
}

function PromptInputAction({
  className,
  children,
  ...props
}: PromptInputActionProps) {
  const { disabled } = usePromptInput()

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
  usePromptInput,
}



