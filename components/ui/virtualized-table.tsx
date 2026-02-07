'use client'

import { useRef, useCallback, ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualizedTableProps<T> {
  items: T[]
  estimatedRowHeight?: number
  overscan?: number
  header: ReactNode
  renderRow: (item: T, index: number) => ReactNode
  getRowKey: (item: T, index: number) => string
  maxHeight?: number
  className?: string
}

/**
 * A virtualized table component that only renders visible rows.
 * Uses CSS grid to maintain column alignment between header and body.
 */
export function VirtualizedTable<T>({
  items,
  estimatedRowHeight = 52,
  overscan = 5,
  header,
  renderRow,
  getRowKey,
  maxHeight = 600,
  className = '',
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => estimatedRowHeight, [estimatedRowHeight]),
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  // Only virtualize if we have enough items to warrant it
  if (items.length <= 20) {
    return (
      <div className={className}>
        {header}
        <div className="divide-y divide-border">
          {items.map((item, index) => (
            <div key={getRowKey(item, index)}>
              {renderRow(item, index)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {header}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <div
          style={{
            height: totalSize,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index]
            return (
              <div
                key={getRowKey(item, virtualItem.index)}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="border-b border-border last:border-b-0"
              >
                {renderRow(item, virtualItem.index)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
