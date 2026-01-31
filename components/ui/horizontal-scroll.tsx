'use client'

import { useRef, useState, useEffect, useCallback, ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

interface HorizontalScrollProps {
  children: ReactNode
  className?: string
  containerClassName?: string
  scrollAmount?: number
  showFade?: boolean
}

export function HorizontalScroll({
  children,
  className,
  containerClassName,
  scrollAmount = 200,
  showFade = true
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false })

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth

    setScrollState({
      canScrollLeft: scrollLeft > 5,
      canScrollRight: scrollLeft < maxScroll - 5
    })
  }, [])

  useEffect(() => {
    updateScrollState()

    // Also check on resize
    const handleResize = () => updateScrollState()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateScrollState, children])

  const handleScroll = useCallback(() => {
    updateScrollState()
  }, [updateScrollState])

  const scrollLeft = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
  }, [scrollAmount])

  const scrollRight = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }, [scrollAmount])

  const showArrows = scrollState.canScrollLeft || scrollState.canScrollRight

  const arrowButtonClass = (enabled: boolean) => cn(
    'flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200',
    enabled
      ? 'bg-background-elevated border border-border hover:bg-background-inset hover:border-border-strong text-foreground cursor-pointer'
      : 'text-foreground-muted cursor-default opacity-30'
  )

  return (
    <div className={cn('relative flex items-center', containerClassName)}>
      {/* Left Arrow - Desktop only (on left side) */}
      {showArrows && (
        <button
          onClick={scrollLeft}
          disabled={!scrollState.canScrollLeft}
          className={cn(arrowButtonClass(scrollState.canScrollLeft), 'hidden sm:flex')}
          aria-label="Scroll left"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        </button>
      )}

      {/* Scroll Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          'flex-1 min-w-0 overflow-x-auto scrollbar-hide',
          showArrows && 'sm:mx-2',
          className
        )}
        style={showFade ? {
          maskImage: `linear-gradient(to right, ${scrollState.canScrollLeft ? 'transparent' : 'black'}, black ${scrollState.canScrollLeft ? '16px' : '0px'}, black calc(100% - ${scrollState.canScrollRight ? '16px' : '0px'}), ${scrollState.canScrollRight ? 'transparent' : 'black'})`,
          WebkitMaskImage: `linear-gradient(to right, ${scrollState.canScrollLeft ? 'transparent' : 'black'}, black ${scrollState.canScrollLeft ? '16px' : '0px'}, black calc(100% - ${scrollState.canScrollRight ? '16px' : '0px'}), ${scrollState.canScrollRight ? 'transparent' : 'black'})`
        } : undefined}
      >
        {children}
      </div>

      {/* Arrow buttons - Mobile: both together on right, Desktop: only right arrow */}
      {showArrows && (
        <div className="flex items-center gap-1 ml-2 sm:ml-0">
          {/* Left Arrow - Mobile only (grouped with right) */}
          <button
            onClick={scrollLeft}
            disabled={!scrollState.canScrollLeft}
            className={cn(arrowButtonClass(scrollState.canScrollLeft), 'sm:hidden')}
            aria-label="Scroll left"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </button>

          {/* Right Arrow - Always visible */}
          <button
            onClick={scrollRight}
            disabled={!scrollState.canScrollRight}
            className={arrowButtonClass(scrollState.canScrollRight)}
            aria-label="Scroll right"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
