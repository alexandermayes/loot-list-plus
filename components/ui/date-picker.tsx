'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon } from '@hugeicons/core-free-icons'
import { cn } from "@/lib/utils"

/**
 * DatePicker Component - LootList+ Design System
 *
 * A styled date input with calendar icon.
 *
 * Variants:
 * - pill: Fully rounded ends (default) - used in most forms
 * - rounded: Rounded corners - used in cards/compact areas
 *
 * Sizes:
 * - sm: Compact (h-9, text-[12px])
 * - default: Standard (h-11, text-[13px])
 * - lg: Large (h-12, text-[14px])
 */
const datePickerVariants = cva(
  [
    "flex w-full bg-transparent border text-foreground transition-colors",
    "placeholder:text-muted-foreground",
    "hover:border-border-strong hover:bg-background-elevated/50",
    "focus-within:border-accent",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/20",
  ],
  {
    variants: {
      variant: {
        pill: "rounded-[52px] border-border-strong",
        rounded: "rounded-xl border-border-strong",
      },
      size: {
        sm: "h-9 px-3 text-[12px]",
        default: "h-11 px-4 text-[13px]",
        lg: "h-12 px-5 text-[14px]",
      },
    },
    defaultVariants: {
      variant: "pill",
      size: "default",
    },
  }
)

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type">,
    VariantProps<typeof datePickerVariants> {
  iconClassName?: string
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, variant, size, iconClassName, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current!)

    const handleContainerClick = () => {
      // Trigger the native date picker
      inputRef.current?.showPicker?.()
    }

    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16

    return (
      <div
        className={cn(
          datePickerVariants({ variant, size }),
          "relative flex items-center gap-2 cursor-pointer",
          className
        )}
        onClick={handleContainerClick}
      >
        <input
          type="date"
          ref={inputRef}
          className={cn(
            "flex-1 bg-transparent outline-none cursor-pointer",
            "text-foreground",
            "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
            size === 'sm' && "text-[12px]",
            size === 'default' && "text-[13px]",
            size === 'lg' && "text-[14px]",
          )}
          {...props}
        />
        <HugeiconsIcon
          icon={Calendar03Icon}
          size={iconSize}
          className={cn("text-muted-foreground flex-shrink-0 pointer-events-none", iconClassName)}
        />
      </div>
    )
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker, datePickerVariants }
