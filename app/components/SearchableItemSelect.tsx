/**
 * SearchableItemSelect Component
 *
 * A custom dropdown that shows items with Wowhead styling (colored names + icons)
 * Allows searching/filtering items by name
 */

'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import ItemLink from './ItemLink'
import ClassPrioritySubline from './ClassPrioritySubline'
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'
import { refreshWowheadTooltips } from '@/lib/wowhead'

interface Item {
  id: string
  name: string
  wowhead_id: number
  boss_name: string
  classification?: string
  consensus_count?: number  // Number of other guildmates who ranked this item
  dps_gain?: number  // Expected DPS/HPS gain from this item
  is_loot_council?: boolean  // Item decided by loot council, not rankable
  loot_item_classes?: {
    class_id: string
    spec_id: string | null
    spec_type: string | null
    class_name?: string | null
    class_color?: string | null
    spec_name?: string | null
  }[]
}

interface SearchableItemSelectProps {
  items: Item[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: Set<string>
  currentValue?: string
  isSlotDisabled?: boolean
  /** Shows error styling on the dropdown */
  hasError?: boolean
  /** Set of wowhead_ids that the user already owns (imported from WowSims) */
  ownedWowheadIds?: Set<number>
}

export default function SearchableItemSelect({
  items,
  value,
  onChange,
  placeholder = 'Select item',
  disabled = new Set(),
  currentValue,
  isSlotDisabled = false,
  hasError = false,
  ownedWowheadIds = new Set()
}: SearchableItemSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)

  const selectedItem = useMemo(() => items.find(i => i.id === value), [items, value])

  // Filter items by search (memoized to prevent re-filtering on every render)
  const filteredItems = useMemo(() =>
    items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  )

  // Group items by boss and sort by Classic WoW encounter order (memoized)
  // Normalize boss names to merge multi-boss encounters (e.g., Opera Event)
  const { itemsByBoss, bossNames } = useMemo(() => {
    const byBoss: Record<string, Item[]> = {}
    const order: string[] = []

    filteredItems.forEach(item => {
      const boss = normalizeBossName(item.boss_name || 'Unknown')
      if (!byBoss[boss]) {
        byBoss[boss] = []
        order.push(boss) // Track order as we encounter each boss
      }
      byBoss[boss].push(item)
    })

    // Sort bosses by Classic WoW progression order
    const sortedBossNames = order.sort((a, b) => getBossOrder(a) - getBossOrder(b))

    return { itemsByBoss: byBoss, bossNames: sortedBossNames }
  }, [filteredItems])

  // Close dropdown when clicking outside and update position on scroll
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // Ignore events that don't have a valid target or target is not in the document
      // This prevents closing when mouse leaves the window boundary
      if (!target || !document.body.contains(target)) {
        return
      }

      // Check if click is outside both the button and dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSearch('')
      }
    }

    let rafId: number | null = null
    const handleScroll = () => {
      // Use requestAnimationFrame to throttle position updates
      if (rafId) return

      rafId = requestAnimationFrame(() => {
        if (buttonRef.current && isOpen) {
          const rect = buttonRef.current.getBoundingClientRect()
          setDropdownPosition({
            top: rect.bottom,
            left: rect.left,
            width: rect.width
          })
        }
        rafId = null
      })
    }

    // Small delay to prevent immediate closure on open
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    window.addEventListener('scroll', handleScroll, true)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [isOpen])

  // Handle opening the dropdown with position calculation
  const handleOpen = () => {
    if (isSlotDisabled) return
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      })
    }
    setIsOpen(true)
  }

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Refresh Wowhead tooltips when value changes or dropdown opens
  // Uses centralized debounced refresh to prevent excessive API calls
  useEffect(() => {
    refreshWowheadTooltips()
  }, [value, isOpen])

  const handleSelect = useCallback((itemId: string) => {
    onChange(itemId)
    setIsOpen(false)
    setSearch('')
  }, [onChange])

  const handleClear = useCallback(() => {
    onChange('')
    setIsOpen(false)
    setSearch('')
  }, [onChange])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Container */}
      <div
        ref={buttonRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={isSlotDisabled}
        tabIndex={isSlotDisabled ? -1 : 0}
        onClick={() => {
          if (isSlotDisabled) return
          isOpen ? setIsOpen(false) : handleOpen()
        }}
        onKeyDown={(e) => {
          if (isSlotDisabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            isOpen ? setIsOpen(false) : handleOpen()
          }
        }}
        className={`w-full px-3 py-2 bg-background-elevated border rounded-[52px] text-left focus:outline-none flex items-center justify-between gap-2 ${
          isSlotDisabled
            ? 'opacity-50 cursor-not-allowed text-muted-foreground border-border-strong'
            : hasError
              ? 'text-foreground cursor-pointer border-destructive border-2 focus:border-destructive'
              : 'text-foreground focus:border-accent cursor-pointer border-border-strong'
        }`}
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          {selectedItem ? (
            <>
              <span className="truncate">
                <ItemLink name={selectedItem.name} wowheadId={selectedItem.wowhead_id} clickable={false} />
              </span>
              {selectedItem.is_loot_council ? (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent flex-shrink-0">Loot Council</span>
              ) : selectedItem.classification && selectedItem.classification !== 'Unlimited' ? (
                <span className="text-xs text-muted-foreground flex-shrink-0">[{selectedItem.classification}]</span>
              ) : null}
            </>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Clear button (X) - only show when item is selected */}
          {selectedItem && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="w-6 h-6 min-h-0 rounded-full"
              aria-label="Clear selection"
            >
              <svg className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
          <svg
            className="w-4 h-4 transition-transform"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && dropdownPosition.width > 0 && (
        <div
          ref={dropdownContentRef}
          className="fixed z-[9999] bg-background-elevated border border-border-strong rounded-lg shadow-lg max-h-96 overflow-hidden"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            minWidth: '250px'
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-border sticky top-0 bg-background-elevated">
            <Input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              variant="rounded"
              size="sm"
            />
          </div>

          {/* Items List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-muted-foreground text-[13px]">
                No items found
              </div>
            ) : (
              bossNames.map(boss => (
                <div key={boss}>
                  {/* Boss Header */}
                  <div className="px-3 py-2 bg-muted border-b border-border">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {boss}
                    </p>
                  </div>
                  {/* Boss Items */}
                  {itemsByBoss[boss].map(item => {
                    const isLc = item.is_loot_council === true
                    const isDisabled = (disabled.has(item.id) && currentValue !== item.id) || isLc
                    const isOwned = ownedWowheadIds.has(item.wowhead_id)
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (!isDisabled) {
                            handleSelect(item.id)
                          }
                        }}
                        disabled={isDisabled}
                        className={`w-full px-3 py-2 h-auto text-left justify-start rounded-none flex items-center gap-2 min-w-0 ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <span className="flex-1 min-w-0 whitespace-normal">
                          <span className="flex items-center gap-2">
                            <span className="truncate whitespace-nowrap">
                              <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                            </span>
                            {isLc ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent flex-shrink-0">
                                Loot Council
                              </span>
                            ) : (
                              <>
                                {item.dps_gain && item.dps_gain > 0 && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent flex-shrink-0">
                                    +{item.dps_gain.toLocaleString()} DPS
                                  </span>
                                )}
                                {isOwned && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/20 text-success flex-shrink-0">
                                    Owned
                                  </span>
                                )}
                                {item.consensus_count && item.consensus_count > 0 && (
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {item.consensus_count} ranked
                                  </span>
                                )}
                                {item.classification && item.classification !== 'Unlimited' && (
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    [{item.classification}]
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                          {!isLc && <ClassPrioritySubline lootItemClasses={item.loot_item_classes} />}
                        </span>
                        {value === item.id && (
                          <img
                            src="/icons/tick.svg"
                            alt="Selected"
                            width={16}
                            height={16}
                            className="icon-adaptive w-4 h-4 shrink-0"
                          />
                        )}
                      </Button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
