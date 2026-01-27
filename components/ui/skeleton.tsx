import { cn } from "@/lib/utils"

/**
 * Skeleton Component - Placeholder loading animation
 *
 * Use for content placeholders while data is loading.
 * Shows a shimmer animation over a muted background.
 *
 * Common patterns:
 * - Text: <Skeleton className="h-4 w-48" />
 * - Avatar: <Skeleton className="h-10 w-10 rounded-full" />
 * - Card: <Skeleton className="h-32 w-full" />
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-muted", className)}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
    </div>
  )
}

export { Skeleton }
