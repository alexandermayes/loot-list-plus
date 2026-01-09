import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  fullScreen?: boolean
  text?: string
}

export function LoadingSpinner({
  className,
  fullScreen = false,
  text
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={cn("animate-spin text-primary", className)} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}
