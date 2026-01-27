import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Select Component - LootList+ Design System
 *
 * Native select element styled to match the design system.
 * For more complex dropdowns, use a custom dropdown component.
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
const selectVariants = cva(
  [
    "flex w-full bg-background-elevated border text-foreground transition-colors cursor-pointer appearance-none",
    "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2.22%204.47a.75.75%200%200%201%201.06%200L6%207.19l2.72-2.72a.75.75%200%200%201%201.06%201.06l-3.25%203.25a.75.75%200%200%201-1.06%200L2.22%205.53a.75.75%200%200%201%200-1.06z%22%2F%3E%3C%2Fsvg%3E')]",
    "bg-[length:12px] bg-[right_12px_center] bg-no-repeat",
    "hover:border-border-strong",
    "focus:outline-none focus:border-accent",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background",
  ],
  {
    variants: {
      variant: {
        pill: "rounded-[52px] border-border-strong pr-10",
        rounded: "rounded-xl border-border pr-9",
      },
      size: {
        sm: "h-9 pl-3 text-[12px]",
        default: "h-11 pl-4 text-[13px]",
        lg: "h-12 pl-5 text-[14px]",
      },
    },
    defaultVariants: {
      variant: "pill",
      size: "default",
    },
  }
)

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <select
        className={cn(selectVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select, selectVariants }
