/**
 * SearchableItemSelect Component
 *
 * A custom dropdown that shows items with Wowhead styling (colored names + icons)
 * Allows searching/filtering items by name
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import ItemLink from './ItemLink'
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'

interface Item {
  id: string
  name: string
  wowhead_id: number
  boss_name: string
  classification?: string
}

interface SearchableItemSelectProps {
  items: Item[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: Set<string>
  currentValue?: string
}

export default function SearchableItemSelect({
  items,
  value,
  onChange,
  placeholder = 'Select item',
  disabled = new Set(),
  currentValue
}: SearchableItemSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)

  const selectedItem = items.find(i => i.id === value)

  // Filter items by search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  // Group items by boss and sort by Classic WoW encounter order
  // Normalize boss names to merge multi-boss encounters (e.g., Opera Event)
  const itemsByBoss: Record<string, Item[]> = {}
  const bossOrder: string[] = []

  filteredItems.forEach(item => {
    const boss = normalizeBossName(item.boss_name || 'Unknown')
    if (!itemsByBoss[boss]) {
      itemsByBoss[boss] = []
      bossOrder.push(boss) // Track order as we encounter each boss
    }
    itemsByBoss[boss].push(item)
  })

  // Sort bosses by Classic WoW progression order
  const bossNames = bossOrder.sort((a, b) => getBossOrder(a) - getBossOrder(b))

  // Close dropdown when clicking outside and update position on scroll
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
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
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).$WowheadPower) {
      const timer = setTimeout(() => {
        try {
          (window as any).$WowheadPower.refreshLinks()
        } catch (e) {
          // Silently fail if Wowhead not loaded
        }
      }, isOpen ? 50 : 10)

      return () => clearTimeout(timer)
    }
  }, [value, isOpen])

  const handleSelect = (itemId: string) => {
    onChange(itemId)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-left focus:outline-none focus:border-[#ff8000] flex items-center justify-between gap-2"
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          {selectedItem ? (
            <>
              <span className="truncate">
                <ItemLink name={selectedItem.name} wowheadId={selectedItem.wowhead_id} clickable={false} />
              </span>
              {selectedItem.classification && selectedItem.classification !== 'Unlimited' && (
                <span className="text-xs text-muted-foreground flex-shrink-0">[{selectedItem.classification}]</span>
              )}
            </>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </span>
        <svg
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && dropdownPosition.width > 0 && (
        <div
          ref={dropdownContentRef}
          className="fixed z-[9999] bg-[#151515] border border-[#383838] rounded-lg shadow-lg max-h-96 overflow-hidden"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            minWidth: '250px'
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-[rgba(255,255,255,0.1)] sticky top-0 bg-[#151515]">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full px-3 py-2 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-md text-white text-sm focus:outline-none focus:border-[#ff8000]"
            />
          </div>

          {/* Clear Option */}
          {value && (
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleClear()
              }}
              className="w-full px-3 py-2 text-left hover:bg-[#1a1a1a] text-[#a1a1a1] text-sm border-b border-[rgba(255,255,255,0.1)]"
            >
              -- Clear Selection --
            </button>
          )}

          {/* Items List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-[#a1a1a1] text-sm">
                No items found
              </div>
            ) : (
              bossNames.map(boss => (
                <div key={boss}>
                  {/* Boss Header */}
                  <div className="px-3 py-2 bg-[#1a1a1a] border-b border-[rgba(255,255,255,0.1)]">
                    <p className="text-xs font-semibold text-white uppercase tracking-wide">
                      {boss}
                    </p>
                  </div>
                  {/* Boss Items */}
                  {itemsByBoss[boss].map(item => {
                    const isDisabled = disabled.has(item.id) && currentValue !== item.id
                    return (
                      <button
                        key={item.id}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (!isDisabled) {
                            handleSelect(item.id)
                          }
                        }}
                        disabled={isDisabled}
                        className={`w-full px-3 py-2 text-left hover:bg-[#1a1a1a] flex items-center gap-2 min-w-0 ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        } ${value === item.id ? 'bg-[#1a1a1a]' : ''}`}
                      >
                        <span className="truncate flex-1 min-w-0">
                          <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                        </span>
                        {item.classification && item.classification !== 'Unlimited' && (
                          <span className="text-xs text-[#a1a1a1] flex-shrink-0">
                            [{item.classification}]
                          </span>
                        )}
                      </button>
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
