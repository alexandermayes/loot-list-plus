import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card Component - LootList+ Design System
 *
 * Elevated surface with subtle border and background differentiation.
 * Uses background-elevated for visual layering.
 *
 * Variants:
 * - "default": Padding on CardHeader and CardContent separately (original behavior)
 * - "unified": Padding on Card itself, with 12px gap between header and content
 */

type CardVariant = "default" | "unified"

const CardContext = React.createContext<CardVariant>("default")

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <CardContext.Provider value={variant}>
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-border bg-card text-card-foreground",
          variant === "unified" && "p-4 sm:p-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CardContext.Provider>
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(CardContext)
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5",
        variant === "default" ? "p-4 sm:p-6" : "pb-3",
        className
      )}
      {...props}
    />
  )
})
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-base text-foreground-secondary", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(CardContext)
  return (
    <div
      ref={ref}
      className={cn(
        variant === "default" && "p-4 sm:p-6 pt-0",
        className
      )}
      {...props}
    />
  )
})
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(CardContext)
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        variant === "default" && "p-4 sm:p-6 pt-0",
        className
      )}
      {...props}
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
