/**
 * ReserveItemPicker Component
 *
 * Multi-select item picker for the Reserve feature. Items are grouped by boss,
 * shown with Wowhead-styled names, and support hard-reserved disabling.
 */

'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import ItemLink from './ItemLink'
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'
import { refreshWowheadTooltips } from '@/lib/wowhead'

interface ReserveItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification?: string
}

interface ReserveItemPickerProps {
  items: ReserveItem[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  maxSelections: number
  disabledIds?: Set<string>
  placeholder?: string
  allowDuplicates?: boolean
}

export default function ReserveItemPicker({
  items,
  selectedIds,
  onChange,
  maxSelections,
  disabledIds = new Set(),
  placeholder = 'Search items...',
  allowDuplicates = false,
}: ReserveItemPickerProps) {
  const [search, setSearch] = useState('')
  // Track how many times each item is reserved so the same id can appear more
  // than once when duplicates are allowed (a plain Set would collapse them).
  const selectedCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const id of selectedIds) counts.set(id, (counts.get(id) ?? 0) + 1)
    return counts
  }, [selectedIds])
  const atMax = selectedIds.length >= maxSelections

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.boss_name?.toLowerCase().includes(q)
    )
  }, [items, search])

  const { itemsByBoss, bossNames } = useMemo(() => {
    const byBoss: Record<string, ReserveItem[]> = {}
    const order: string[] = []

    filteredItems.forEach((item) => {
      const boss = normalizeBossName(item.boss_name || 'Unknown')
      if (!byBoss[boss]) {
        byBoss[boss] = []
        order.push(boss)
      }
      byBoss[boss].push(item)
    })

    const sortedBossNames = order.sort((a, b) => getBossOrder(a) - getBossOrder(b))
    return { itemsByBoss: byBoss, bossNames: sortedBossNames }
  }, [filteredItems])

  // Unique selected items in first-seen order, each with its reserved quantity.
  const selectedItems = useMemo(() => {
    const seen = new Set<string>()
    const result: { item: ReserveItem; count: number }[] = []
    for (const id of selectedIds) {
      if (seen.has(id)) continue
      seen.add(id)
      const item = items.find((i) => i.id === id)
      if (item) result.push({ item, count: selectedCounts.get(id) ?? 1 })
    }
    return result
  }, [selectedIds, items, selectedCounts])

  // Re-scan wowhead tooltips whenever the rendered item set changes.
  // `items` is the main trigger — on initial mount the parent's fetch
  // hasn't populated it yet, so without this dep the dropdown items
  // never get registered with wowhead power.js.
  useEffect(() => {
    refreshWowheadTooltips()
  }, [items, selectedIds, search])

  const handleToggle = useCallback(
    (itemId: string) => {
      // When duplicates are allowed, a click always adds another copy (up to the
      // cap). Copies are removed from the selected-item badges instead, so a
      // second click never silently drops the item.
      if (allowDuplicates) {
        if (!atMax) onChange([...selectedIds, itemId])
        return
      }
      if (selectedCounts.has(itemId)) {
        onChange(selectedIds.filter((id) => id !== itemId))
      } else if (!atMax) {
        onChange([...selectedIds, itemId])
      }
    },
    [allowDuplicates, selectedIds, selectedCounts, atMax, onChange]
  )

  const handleRemove = useCallback(
    (itemId: string) => {
      if (allowDuplicates) {
        // Drop a single copy (the last occurrence), leaving any others intact.
        const idx = selectedIds.lastIndexOf(itemId)
        if (idx === -1) return
        onChange([...selectedIds.slice(0, idx), ...selectedIds.slice(idx + 1)])
      } else {
        onChange(selectedIds.filter((id) => id !== itemId))
      }
    },
    [allowDuplicates, selectedIds, onChange]
  )

  return (
    <div className="bg-background-subtle border border-border rounded-xl overflow-hidden">
      {selectedItems.length > 0 && (
        <div className="px-3 pt-3 pb-1 flex flex-wrap gap-x-3 gap-y-1.5">
          {selectedItems.map(({ item, count }) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 text-[12px]"
            >
              <ItemLink
                name={item.name}
                wowheadId={item.wowhead_id}
                clickable={false}
              />
              {count > 1 && (
                <span className="text-muted-foreground tabular-nums">
                  ×{count}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={count > 1 ? `Remove one ${item.name}` : `Remove ${item.name}`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex-1">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            variant="rounded"
            size="sm"
          />
        </div>
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
          {selectedIds.length}/{maxSelections} reserves selected
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto border-t border-border">
        {filteredItems.length === 0 ? (
          <div className="px-3 py-4 text-center text-muted-foreground text-[13px]">
            No items found
          </div>
        ) : (
          bossNames.map((boss) => (
            <div key={boss}>
              <div className="px-3 py-1.5 bg-background-subtle border-y border-border sticky top-0 z-10">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {boss}
                </p>
              </div>
              {itemsByBoss[boss].map((item) => {
                const isHardReserved = disabledIds.has(item.id)
                const count = selectedCounts.get(item.id) ?? 0
                const isSelected = count > 0
                // At the cap, block every add. Without duplicates, already-selected
                // rows stay clickable so they can be toggled off.
                const isDisabled =
                  isHardReserved || (atMax && (allowDuplicates || !isSelected))

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={isDisabled ? -1 : 0}
                    aria-disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) handleToggle(item.id)
                    }}
                    onKeyDown={(e) => {
                      if (isDisabled) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleToggle(item.id)
                      }
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center gap-2 min-w-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-muted cursor-pointer'
                    }`}
                  >
                    <span className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="truncate text-[12px]">
                        <ItemLink
                          name={item.name}
                          wowheadId={item.wowhead_id}
                          clickable={false}
                        />
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {item.item_slot}
                      </span>
                      {item.classification &&
                        item.classification !== 'Unlimited' && (
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">
                            [{item.classification}]
                          </span>
                        )}
                      {isHardReserved && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/20 text-destructive flex-shrink-0">
                          Hard reserved
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 shrink-0">
                        {allowDuplicates && count > 1 && (
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            ×{count}
                          </span>
                        )}
                        <img
                          src="/icons/tick.svg"
                          alt="Selected"
                          width={14}
                          height={14}
                          className="icon-adaptive w-3.5 h-3.5"
                        />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
