import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Alert Component - Inline notification/message styling
 *
 * Variants:
 * - default: Neutral background for general information
 * - success: Green styling for success messages
 * - destructive: Red styling for errors
 * - warning: Yellow/orange styling for warnings
 * - info: Blue/accent styling for informational messages
 */
const alertVariants = cva(
  "relative w-full rounded-xl border p-4 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  {
    variants: {
      variant: {
        default: "bg-background-elevated border-border text-foreground [&>svg]:text-foreground",
        success: "bg-success/10 border-success/30 text-success [&>svg]:text-success",
        destructive: "bg-destructive/10 border-destructive/30 text-destructive [&>svg]:text-destructive",
        warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500 [&>svg]:text-yellow-500",
        info: "bg-accent/10 border-accent/30 text-accent [&>svg]:text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
