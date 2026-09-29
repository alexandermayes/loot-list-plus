"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card Component - LootList+ Design System
 *
 * Client component: Card shares its `variant` with CardHeader/CardContent/
 * CardFooter through React context, and context is a client-only React
 * feature -- React's `react-server` conditional build exports no
 * createContext/useContext at all. Without this directive, any React Server
 * Component that imports Card (app/blog/*, app/research/*, app/customers/*)
 * compiles the real module into the RSC layer and the build dies at
 * "Collecting page data" with `TypeError: c.createContext is not a function`.
 * Same reason components/ui/modal.tsx carries the directive.
 *
 * Elevated surface with subtle border and background differentiation.
 * Uses background-elevated for visual layering.
 *
 * Variants:
 * - "default": Padding on CardHeader and CardContent separately (original behavior)
 * - "unified": Padding on Card itself, with 12px gap between header and content
 * - "nested": No fill, no border, no radius -- a transparent region inside
 *   its parent Card, separated by the app's existing top-divider idiom
 *   (border-t border-border). Padding passes through via className exactly
 *   like every other variant; the variant imposes none of its own. The
 *   divider is suppressed when the nested card is the first child of its
 *   parent (first:border-t-0), so no call site has to remember to turn it
 *   off when it would otherwise double up against the parent's own top
 *   edge or header rule.
 */

type CardVariant = "default" | "unified" | "nested"

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
          variant === "nested"
            ? "border-t border-border first:border-t-0"
            : "rounded-xl border border-border bg-card text-card-foreground",
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
