import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Textarea Component - LootList+ Design System
 *
 * Variants:
 * - pill: Rounded ends (uses rounded-3xl for multi-line)
 * - rounded: Standard rounded corners
 *
 * Sizes:
 * - sm: Compact
 * - default: Standard
 * - lg: Large
 */
const textareaVariants = cva(
  [
    "flex w-full bg-background-elevated border text-foreground transition-colors resize-none",
    "placeholder:text-muted-foreground",
    "hover:border-border-strong",
    "focus:outline-none focus:border-accent",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background",
  ],
  {
    variants: {
      variant: {
        pill: "rounded-3xl border-border-strong",
        rounded: "rounded-xl border-border-strong",
      },
      size: {
        sm: "min-h-[80px] px-4 py-3 text-[16px] sm:text-[12px]",
        default: "min-h-[100px] px-5 py-4 text-[16px] sm:text-[13px]",
        lg: "min-h-[120px] px-6 py-5 text-[16px] sm:text-[14px]",
      },
    },
    defaultVariants: {
      variant: "pill",
      size: "default",
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
