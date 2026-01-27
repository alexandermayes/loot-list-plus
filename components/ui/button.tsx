import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button Component - LootList+ Design System
 *
 * Variants:
 * - primary: White button with dark text, subtle shadow (main CTAs)
 * - secondary: Dark elevated button with white text
 * - destructive: Red button for dangerous actions
 * - outline: Bordered button with transparent background
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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary: White button with depth (shadow + subtle gradient)
        primary:
          "bg-primary text-primary-foreground border border-border-strong shadow-sm hover:shadow-md hover:brightness-95 dark:hover:brightness-110",

        // Secondary: Dark elevated surface
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-background-elevated hover:border-border-strong",

        // Destructive: Red for dangerous actions
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",

        // Outline: Bordered, transparent background
        outline:
          "border border-border bg-transparent hover:bg-background-elevated hover:border-border-strong",

        // Ghost: No border, subtle hover
        ghost:
          "hover:bg-background-elevated hover:text-foreground",

        // Link: Text only with underline
        link:
          "text-accent underline-offset-4 hover:underline p-0 h-auto",

        // Accent: Orange accent button
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm shadow-accent/20",

        // Default (legacy support - maps to primary)
        default:
          "bg-primary text-primary-foreground border border-border-strong shadow-sm hover:shadow-md hover:brightness-95 dark:hover:brightness-110",
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
