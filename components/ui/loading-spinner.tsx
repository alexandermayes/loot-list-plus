import { cn } from '@/lib/utils'
import Image from 'next/image'

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
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Pulsing loot icon */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <Image
          src="/loot-icon.svg"
          alt="Loading"
          width={48}
          height={48}
          className="brightness-0 invert animate-pulse-fast"
          priority
        />
      </div>

      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}
