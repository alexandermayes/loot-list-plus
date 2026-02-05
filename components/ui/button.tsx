import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/loading-spinner"

/**
 * Button Component - LootList+ Design System
 *
 * Variants:
 * - primary: Main CTA - dark in light mode, white in dark mode
 * - primary-outline: Bordered primary for secondary emphasis
 * - secondary: Subtle elevated button with border
 * - destructive: Red for dangerous/delete actions (solid background)
 * - destructive-outline: Subtle red border for secondary delete actions
 * - destructive-ghost: Red text only for tertiary delete actions
 * - success: Green for approve/confirm actions (solid background)
 * - success-outline: Subtle green border for secondary confirm actions
 * - success-ghost: Green text only for tertiary confirm actions
 * - outline: Bordered with transparent background
 * - ghost: No background, subtle hover state
 * - link: Text-only with underline on hover
 * - accent: Orange accent button for special actions (solid)
 * - accent-subtle: Orange accent with subtle background (for selected/active states)
 *
 * Sizes:
 * - sm: Small (36px height, 40px radius)
 * - default: Standard (44px height, 52px radius)
 * - lg: Large (48px height, 60px radius)
 * - icon: Square icon button (40px)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Main CTA button - inverts between light/dark mode
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground",

        // Primary Outline: Bordered primary for secondary emphasis
        "primary-outline":
          "border border-primary/50 text-primary bg-transparent hover:bg-primary/10 hover:border-primary disabled:opacity-50",

        // Secondary: Elevated surface with border
        secondary:
          "bg-background-elevated text-foreground border border-border hover:bg-muted hover:border-border-strong disabled:opacity-50",

        // Destructive: Red for dangerous actions
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50",

        // Destructive Outline: Subtle red border for secondary delete actions
        "destructive-outline":
          "border border-destructive/50 text-destructive bg-transparent hover:bg-destructive/10 hover:border-destructive disabled:opacity-50",

        // Destructive Ghost: Red text only for tertiary delete actions
        "destructive-ghost":
          "text-destructive bg-transparent hover:bg-destructive/10 disabled:opacity-50",

        // Success: Green for approve/confirm actions
        success:
          "bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50",

        // Success Outline: Subtle green border for secondary confirm actions
        "success-outline":
          "border border-success/50 text-success bg-transparent hover:bg-success/10 hover:border-success disabled:opacity-50",

        // Success Ghost: Green text only for tertiary confirm actions
        "success-ghost":
          "text-success bg-transparent hover:bg-success/10 disabled:opacity-50",

        // Outline: Bordered, transparent background
        outline:
          "border border-border bg-transparent text-foreground hover:bg-background-elevated hover:border-border-strong disabled:opacity-50",

        // Ghost: No border, subtle hover
        ghost:
          "text-foreground hover:bg-background-elevated disabled:opacity-50",

        // Link: Text only with underline
        link:
          "text-accent underline-offset-4 hover:underline p-0 h-auto disabled:opacity-50",

        // Accent: Orange accent button (solid)
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50",

        // Accent Subtle: Orange accent with subtle background (for selected states)
        "accent-subtle":
          "bg-accent/20 text-accent border border-accent/20 hover:bg-accent/30 disabled:opacity-50",

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
  /** Shows a spinner and disables the button */
  loading?: boolean
  /** Text to show while loading (replaces children) */
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Determine spinner size based on button size
    const spinnerSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size={spinnerSize} className="shrink-0" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
