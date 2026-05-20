import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Solid accent badge (e.g. "Today" — high-emphasis current-state marker)
        accent:
          "border-transparent bg-accent text-accent-foreground",
        // Subtle accent badge (e.g. "Bonus" — low-emphasis accent annotation)
        "accent-subtle":
          "bg-accent/20 text-accent border-accent/40",
        // Subtle success badge (e.g. "Imported" — confirms a completed state)
        "success-subtle":
          "bg-success/30 text-success border-success/50",
        // Subtle destructive badge (e.g. "Skipped" — non-blocking negative state)
        "destructive-subtle":
          "bg-destructive/30 text-destructive border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
