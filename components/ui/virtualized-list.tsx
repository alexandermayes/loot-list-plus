'use client'

import { useRef, useCallback, ReactNode } from 'react'
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual'

interface VirtualizedListProps<T> {
  items: T[]
  estimatedItemHeight?: number
  overscan?: number
  renderItem: (item: T, index: number) => ReactNode
  getItemKey: (item: T, index: number) => string
  className?: string
  itemClassName?: string
  /** Minimum items before virtualization kicks in (default: 10) */
  minItemsToVirtualize?: number
}

/**
 * A virtualized list component that only renders visible items.
 * For lists with few items, renders normally without virtualization overhead.
 */
export function VirtualizedList<T>({
  items,
  estimatedItemHeight = 200,
  overscan = 3,
  renderItem,
  getItemKey,
  className = '',
  itemClassName = '',
  minItemsToVirtualize = 10,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => estimatedItemHeight, [estimatedItemHeight]),
    overscan,
  })

  // Only virtualize if we have enough items
  if (items.length < minItemsToVirtualize) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={getItemKey(item, index)} className={itemClassName}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    )
  }

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  return (
    <div ref={parentRef} className={`overflow-auto ${className}`}>
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
              key={getItemKey(item, virtualItem.index)}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={itemClassName}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface WindowVirtualizedListProps<T> {
  items: T[]
  estimatedItemHeight?: number
  overscan?: number
  renderItem: (item: T, index: number) => ReactNode
  getItemKey: (item: T, index: number) => string
  className?: string
  itemClassName?: string
  /** Minimum items before virtualization kicks in (default: 15) */
  minItemsToVirtualize?: number
  /** Offset from top of page to account for sticky headers */
  scrollMargin?: number
}

/**
 * A window-scrolling virtualized list that uses the document scroll.
 * Best for full-page lists where you want natural browser scrolling.
 */
export function WindowVirtualizedList<T>({
  items,
  estimatedItemHeight = 200,
  overscan = 5,
  renderItem,
  getItemKey,
  className = '',
  itemClassName = '',
  minItemsToVirtualize = 15,
  scrollMargin = 0,
}: WindowVirtualizedListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: useCallback(() => estimatedItemHeight, [estimatedItemHeight]),
    overscan,
    scrollMargin: scrollMargin,
  })

  // Only virtualize if we have enough items
  if (items.length < minItemsToVirtualize) {
    return (
      <div ref={listRef} className={className}>
        {items.map((item, index) => (
          <div key={getItemKey(item, index)} className={itemClassName}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    )
  }

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  return (
    <div ref={listRef} className={className}>
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
              key={getItemKey(item, virtualItem.index)}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={itemClassName}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Hook for manual virtualization control in existing components.
 * Use when you need more control over the virtualization behavior.
 */
export function useVirtualList<T>(
  items: T[],
  parentRef: React.RefObject<HTMLElement | null>,
  options: {
    estimatedItemHeight?: number
    overscan?: number
  } = {}
) {
  const { estimatedItemHeight = 100, overscan = 5 } = options

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => estimatedItemHeight, [estimatedItemHeight]),
    overscan,
  })

  return {
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    measureElement: virtualizer.measureElement,
  }
}
