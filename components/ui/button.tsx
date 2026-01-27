import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button Component - LootList+ Design System
 *
 * Variants:
 * - primary: Main CTA - dark in light mode, white in dark mode
 * - secondary: Subtle elevated button with border
 * - destructive: Red for dangerous/delete actions
 * - success: Green for approve/confirm actions
 * - outline: Bordered with transparent background
 * - ghost: No background, subtle hover state
 * - link: Text-only with underline on hover
 * - accent: Orange accent button for special actions
 *
 * Sizes:
 * - sm: Small (36px height, 40px radius)
 * - default: Standard (44px height, 52px radius)
 * - lg: Large (48px height, 60px radius)
 * - icon: Square icon button (40px)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary: Main CTA button - inverts between light/dark mode
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground",

        // Secondary: Elevated surface with border
        secondary:
          "bg-background-elevated text-foreground border border-border hover:bg-muted hover:border-border-strong disabled:opacity-50",

        // Destructive: Red for dangerous actions
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50",

        // Success: Green for approve/confirm actions
        success:
          "bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50",

        // Outline: Bordered, transparent background
        outline:
          "border border-border bg-transparent text-foreground hover:bg-background-elevated hover:border-border-strong disabled:opacity-50",

        // Ghost: No border, subtle hover
        ghost:
          "text-foreground hover:bg-background-elevated disabled:opacity-50",

        // Link: Text only with underline
        link:
          "text-accent underline-offset-4 hover:underline p-0 h-auto disabled:opacity-50",

        // Accent: Orange accent button
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50",

        // Default (legacy support - maps to primary)
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground",
      },
      size: {
        // Small: Compact buttons, nav items
        sm: "h-9 px-4 text-sm rounded-pill-sm",

        // Default: Standard button size
        default: "h-11 px-5 text-base rounded-pill",

        // Large: Prominent CTAs
        lg: "h-12 px-8 text-lg rounded-pill-lg",

        // Icon: Square icon button
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
