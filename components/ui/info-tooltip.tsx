'use client'

import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  content: string
  className?: string
  iconSize?: number
}

export function InfoTooltip({ content, className, iconSize = 14 }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const iconRef = useRef<HTMLSpanElement>(null)

  const showTooltip = useCallback(() => {
    if (!iconRef.current) return
    const rect = iconRef.current.getBoundingClientRect()
    setPosition({
      top: rect.top,
      left: rect.left + rect.width / 2,
    })
    setVisible(true)
  }, [])

  const hideTooltip = useCallback(() => {
    setVisible(false)
  }, [])

  return (
    <>
      <span
        ref={iconRef}
        className={cn('inline-flex items-center', className)}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 16 16"
          fill="none"
          className="text-foreground-secondary cursor-help flex-shrink-0"
          aria-label="More info"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <text
            x="8"
            y="11.5"
            textAnchor="middle"
            fill="currentColor"
            fontSize="9"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            i
          </text>
        </svg>
      </span>
      {visible && position && createPortal(
        <span
          role="tooltip"
          className="fixed w-[240px] px-3 py-2.5 rounded-lg bg-background-elevated border border-border shadow-lg text-[12px] leading-relaxed text-foreground-secondary z-[9999] pointer-events-none"
          style={{
            top: position.top - 8,
            left: position.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-border" />
        </span>,
        document.body
      )}
    </>
  )
}
