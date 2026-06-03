"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Loader2, Circle } from "lucide-react"

export interface ChainOfThoughtStep {
  text: string
  status: "pending" | "loading" | "completed" | "error"
}

export interface ChainOfThoughtProps {
  steps: ChainOfThoughtStep[]
  className?: string
}

function ChainOfThought({ steps, className }: ChainOfThoughtProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {steps.map((step, index) => (
        <ChainOfThoughtItem key={index} step={step} />
      ))}
    </div>
  )
}

interface ChainOfThoughtItemProps {
  step: ChainOfThoughtStep
}

function ChainOfThoughtItem({ step }: ChainOfThoughtItemProps) {
  const getIcon = () => {
    switch (step.status) {
      case "completed":
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check className="h-3 w-3" />
          </div>
        )
      case "loading":
        return (
          <div className="flex h-5 w-5 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )
      case "error":
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
            <span className="text-xs font-bold">!</span>
          </div>
        )
      default:
        return (
          <div className="flex h-5 w-5 items-center justify-center">
            <Circle className="h-3 w-3 text-muted-foreground/50" />
          </div>
        )
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 text-sm transition-opacity duration-200",
        step.status === "pending" && "opacity-50",
        step.status === "loading" && "opacity-100",
        step.status === "completed" && "opacity-70"
      )}
    >
      {getIcon()}
      <span
        className={cn(
          "flex-1",
          step.status === "completed" && "text-muted-foreground",
          step.status === "loading" && "font-medium"
        )}
      >
        {step.text}
      </span>
    </div>
  )
}

export { ChainOfThought, ChainOfThoughtItem }



