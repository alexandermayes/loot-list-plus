import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Input Component - LootList+ Design System
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
const inputVariants = cva(
  [
    "flex w-full bg-transparent border text-foreground transition-colors",
    "placeholder:text-muted-foreground",
    "hover:border-border-strong hover:bg-background-elevated/50",
    "focus:outline-none focus:border-accent",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/20",
  ],
  {
    variants: {
      variant: {
        pill: "rounded-[52px] border-border-strong",
        rounded: "rounded-xl border-border",
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

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, size, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
